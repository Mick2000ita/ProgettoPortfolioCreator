import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PortfolioPublicDto } from './auth-api.service';

const PORTFOLIO_PREVIEW_STORAGE_KEY = 'portfolio-editor-preview';
const PORTFOLIO_PREVIEW_STORAGE_SIGNAL_KEY = 'portfolio-editor-preview-updated';
const PORTFOLIO_PREVIEW_DB_NAME = 'portfolio-preview-live';
const PORTFOLIO_PREVIEW_DB_VERSION = 1;
const PORTFOLIO_PREVIEW_STORE_NAME = 'snapshots';
const PREVIEW_CHANNEL_PREFIX = 'portfolio-preview-live:';
const MAX_LOCAL_STORAGE_SNAPSHOT_LENGTH = 2 * 1024 * 1024;
const MAX_SOCKET_MESSAGE_LENGTH = 48 * 1024;

interface PreviewEnvelope {
  slug: string;
  snapshot: PortfolioPublicDto;
}

interface PreviewChunkEnvelope {
  slug: string;
  kind: 'snapshot-chunk';
  id: string;
  index: number;
  total: number;
  chunk: string;
}

interface StoredPreviewRecord {
  slug: string;
  snapshot: PortfolioPublicDto;
  updatedAt: number;
}

interface PendingChunkSnapshot {
  chunks: string[];
  received: number;
  total: number;
  timerId: number | null;
}

interface LiveChannel {
  socket: WebSocket | null;
  broadcastChannel: BroadcastChannel | null;
  subscribers: Set<(snapshot: PortfolioPublicDto) => void>;
  pendingMessages: string[];
  reconnectTimerId: number | null;
  incomingChunks: Map<string, PendingChunkSnapshot>;
  storageHandler: ((event: StorageEvent) => void) | null;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioPreviewLiveService {
  private readonly channels = new Map<string, LiveChannel>();

  connect(slug: string, onSnapshot: (snapshot: PortfolioPublicDto) => void) {
    const channel = this.ensureChannel(slug);
    channel.subscribers.add(onSnapshot);
    this.ensureSocket(slug, channel);

    return () => {
      channel.subscribers.delete(onSnapshot);
      if (channel.subscribers.size === 0) {
        this.closeChannel(slug);
      }
    };
  }

  publish(slug: string, snapshot: PortfolioPublicDto) {
    const channel = this.ensureChannel(slug);
    const message = JSON.stringify({ slug, snapshot });
    const socketMessages = this.createSocketMessages(slug, message);

    channel.broadcastChannel?.postMessage({ slug, snapshot });
    this.ensureSocket(slug, channel);
    this.sendSocketMessages(channel, socketMessages);
  }

  async readStoredPreview(slug: string): Promise<PortfolioPublicDto | null> {
    const indexedPreview = await this.readIndexedDbPreview(slug);
    if (indexedPreview) {
      return indexedPreview;
    }

    return this.readLocalStoragePreview(slug);
  }

  async writeStoredPreview(snapshot: PortfolioPublicDto) {
    await this.writeIndexedDbPreview(snapshot);
    this.writeLocalStoragePreview(snapshot);
    this.notifyStoredPreview(snapshot.slug);
  }

  private readLocalStoragePreview(slug: string): PortfolioPublicDto | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    const rawValue = window.localStorage.getItem(PORTFOLIO_PREVIEW_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return this.parseSnapshot(rawValue, slug);
  }

  private writeLocalStoragePreview(snapshot: PortfolioPublicDto) {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }

    try {
      const serializedSnapshot = JSON.stringify(snapshot);
      if (serializedSnapshot.length > MAX_LOCAL_STORAGE_SNAPSHOT_LENGTH) {
        window.localStorage.removeItem(PORTFOLIO_PREVIEW_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(PORTFOLIO_PREVIEW_STORAGE_KEY, serializedSnapshot);
    } catch {
      try {
        window.localStorage.removeItem(PORTFOLIO_PREVIEW_STORAGE_KEY);
      } catch {
        // Preview navigation must keep working even when browser storage is unavailable.
      }
    }
  }

  private ensureChannel(slug: string): LiveChannel {
    const currentChannel = this.channels.get(slug);
    if (currentChannel) {
      return currentChannel;
    }

    const channel: LiveChannel = {
      socket: null,
      broadcastChannel: this.createBroadcastChannel(slug),
      subscribers: new Set(),
      pendingMessages: [],
      reconnectTimerId: null,
      incomingChunks: new Map(),
      storageHandler: null,
    };

    channel.broadcastChannel?.addEventListener('message', (event) => {
      const snapshot = this.parseSnapshot(event.data, slug);
      if (snapshot) {
        this.emit(channel, snapshot);
      }
    });

    if (typeof window !== 'undefined') {
      channel.storageHandler = (event) => {
        if (event.key !== PORTFOLIO_PREVIEW_STORAGE_KEY || !event.newValue) {
          if (event.key === PORTFOLIO_PREVIEW_STORAGE_SIGNAL_KEY && event.newValue) {
            this.handleStorageSignal(event.newValue, slug, channel);
          }
          return;
        }

        const snapshot = this.parseSnapshot(event.newValue, slug);
        if (snapshot) {
          this.emit(channel, snapshot);
        }
      };
      window.addEventListener('storage', channel.storageHandler);
    }

    this.channels.set(slug, channel);
    return channel;
  }

  private ensureSocket(slug: string, channel: LiveChannel) {
    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      return;
    }

    if (
      channel.socket &&
      (channel.socket.readyState === WebSocket.OPEN ||
        channel.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(this.getPreviewSocketUrl(slug));
    channel.socket = socket;

    socket.addEventListener('open', () => {
      this.flushPendingMessages(channel);
    });

    socket.addEventListener('message', (event) => {
      this.handleIncomingSocketMessage(event.data, slug, channel);
    });

    socket.addEventListener('close', () => {
      if (channel.socket === socket) {
        channel.socket = null;
      }
      this.scheduleReconnect(slug, channel);
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  private scheduleReconnect(slug: string, channel: LiveChannel) {
    if (channel.reconnectTimerId !== null || channel.subscribers.size === 0) {
      return;
    }

    channel.reconnectTimerId = window.setTimeout(() => {
      channel.reconnectTimerId = null;
      this.ensureSocket(slug, channel);
    }, 1200);
  }

  private closeChannel(slug: string) {
    const channel = this.channels.get(slug);
    if (!channel) {
      return;
    }

    channel.socket?.close();
    channel.broadcastChannel?.close();
    if (channel.reconnectTimerId !== null) {
      window.clearTimeout(channel.reconnectTimerId);
    }
    if (typeof window !== 'undefined' && channel.storageHandler) {
      window.removeEventListener('storage', channel.storageHandler);
    }
    channel.incomingChunks.forEach((pendingSnapshot) => {
      if (pendingSnapshot.timerId !== null) {
        window.clearTimeout(pendingSnapshot.timerId);
      }
    });
    this.channels.delete(slug);
  }

  private emit(channel: LiveChannel, snapshot: PortfolioPublicDto) {
    channel.subscribers.forEach((subscriber) => subscriber(snapshot));
  }

  private parseSnapshot(value: unknown, expectedSlug: string): PortfolioPublicDto | null {
    try {
      const parsedValue =
        typeof value === 'string' ? (JSON.parse(value) as PreviewEnvelope | PortfolioPublicDto) : value;
      const snapshot =
        this.isPreviewEnvelope(parsedValue) ? parsedValue.snapshot : (parsedValue as Partial<PortfolioPublicDto>);

      if (snapshot?.slug !== expectedSlug) {
        return null;
      }

      return {
        id: snapshot.id ?? '',
        title: snapshot.title ?? expectedSlug,
        slug: expectedSlug,
        tags: Array.isArray(snapshot.tags) ? snapshot.tags : [],
        public: snapshot.public ?? true,
        showHomeSnapshot: snapshot.showHomeSnapshot,
        showInExplore: snapshot.showInExplore,
        modules: Array.isArray(snapshot.modules) ? snapshot.modules : [],
      };
    } catch {
      return null;
    }
  }

  private handleIncomingSocketMessage(
    value: unknown,
    expectedSlug: string,
    channel: LiveChannel,
  ) {
    const completedMessage = this.resolveChunkedMessage(value, expectedSlug, channel);
    if (completedMessage === null) {
      return;
    }

    const snapshot = this.parseSnapshot(completedMessage, expectedSlug);
    if (snapshot) {
      this.emit(channel, snapshot);
    }
  }

  private resolveChunkedMessage(
    value: unknown,
    expectedSlug: string,
    channel: LiveChannel,
  ): unknown | null {
    const chunk = this.parseChunkEnvelope(value);
    if (!chunk) {
      return value;
    }

    if (
      chunk.slug !== expectedSlug ||
      chunk.index < 0 ||
      chunk.index >= chunk.total ||
      chunk.total < 1
    ) {
      return null;
    }

    let pendingSnapshot = channel.incomingChunks.get(chunk.id);
    if (!pendingSnapshot) {
      pendingSnapshot = {
        chunks: Array.from({ length: chunk.total }, () => ''),
        received: 0,
        total: chunk.total,
        timerId: window.setTimeout(() => {
          channel.incomingChunks.delete(chunk.id);
        }, 10000),
      };
      channel.incomingChunks.set(chunk.id, pendingSnapshot);
    }

    if (!pendingSnapshot.chunks[chunk.index]) {
      pendingSnapshot.chunks[chunk.index] = chunk.chunk;
      pendingSnapshot.received += 1;
    }

    if (pendingSnapshot.received < pendingSnapshot.total) {
      return null;
    }

    if (pendingSnapshot.timerId !== null) {
      window.clearTimeout(pendingSnapshot.timerId);
    }
    channel.incomingChunks.delete(chunk.id);
    return pendingSnapshot.chunks.join('');
  }

  private parseChunkEnvelope(value: unknown): PreviewChunkEnvelope | null {
    try {
      const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
      if (
        !parsedValue ||
        typeof parsedValue !== 'object' ||
        (parsedValue as PreviewChunkEnvelope).kind !== 'snapshot-chunk'
      ) {
        return null;
      }

      const chunk = parsedValue as PreviewChunkEnvelope;
      if (
        typeof chunk.slug !== 'string' ||
        typeof chunk.id !== 'string' ||
        typeof chunk.index !== 'number' ||
        typeof chunk.total !== 'number' ||
        typeof chunk.chunk !== 'string'
      ) {
        return null;
      }

      return chunk;
    } catch {
      return null;
    }
  }

  private createSocketMessages(slug: string, message: string) {
    if (message.length <= MAX_SOCKET_MESSAGE_LENGTH) {
      return [message];
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks: string[] = [];
    for (let start = 0; start < message.length; start += MAX_SOCKET_MESSAGE_LENGTH) {
      chunks.push(message.slice(start, start + MAX_SOCKET_MESSAGE_LENGTH));
    }

    return chunks.map((chunk, index) =>
      JSON.stringify({
        slug,
        kind: 'snapshot-chunk',
        id,
        index,
        total: chunks.length,
        chunk,
      } satisfies PreviewChunkEnvelope),
    );
  }

  private sendSocketMessages(channel: LiveChannel, messages: string[]) {
    if (channel.socket?.readyState !== WebSocket.OPEN) {
      channel.pendingMessages = messages;
      return;
    }

    try {
      messages.forEach((message) => channel.socket?.send(message));
      channel.pendingMessages = [];
    } catch {
      channel.pendingMessages = messages;
      channel.socket?.close();
    }
  }

  private flushPendingMessages(channel: LiveChannel) {
    if (channel.pendingMessages.length === 0) {
      return;
    }

    this.sendSocketMessages(channel, channel.pendingMessages);
  }

  private handleStorageSignal(value: string, expectedSlug: string, channel: LiveChannel) {
    try {
      const signal = JSON.parse(value) as { slug?: string };
      if (signal.slug !== expectedSlug) {
        return;
      }

      void this.readStoredPreview(expectedSlug).then((snapshot) => {
        if (snapshot) {
          this.emit(channel, snapshot);
        }
      });
    } catch {
      // Ignore malformed preview storage pings.
    }
  }

  private notifyStoredPreview(slug: string) {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        PORTFOLIO_PREVIEW_STORAGE_SIGNAL_KEY,
        JSON.stringify({ slug, updatedAt: Date.now() }),
      );
    } catch {
      // The websocket and BroadcastChannel paths still keep the live preview updated.
    }
  }

  private async readIndexedDbPreview(slug: string): Promise<PortfolioPublicDto | null> {
    const database = await this.openPreviewDatabase();
    if (!database) {
      return null;
    }

    return new Promise((resolve) => {
      const transaction = database.transaction(PORTFOLIO_PREVIEW_STORE_NAME, 'readonly');
      const request = transaction.objectStore(PORTFOLIO_PREVIEW_STORE_NAME).get(slug);

      request.onsuccess = () => {
        const record = request.result as StoredPreviewRecord | undefined;
        resolve(record?.snapshot ? this.parseSnapshot(record.snapshot, slug) : null);
      };
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    });
  }

  private async writeIndexedDbPreview(snapshot: PortfolioPublicDto): Promise<boolean> {
    const database = await this.openPreviewDatabase();
    if (!database) {
      return false;
    }

    return new Promise((resolve) => {
      const transaction = database.transaction(PORTFOLIO_PREVIEW_STORE_NAME, 'readwrite');
      transaction.objectStore(PORTFOLIO_PREVIEW_STORE_NAME).put({
        slug: snapshot.slug,
        snapshot,
        updatedAt: Date.now(),
      } satisfies StoredPreviewRecord);

      transaction.oncomplete = () => {
        database.close();
        resolve(true);
      };
      transaction.onerror = () => {
        database.close();
        resolve(false);
      };
      transaction.onabort = () => {
        database.close();
        resolve(false);
      };
    });
  }

  private openPreviewDatabase(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const request = window.indexedDB.open(PORTFOLIO_PREVIEW_DB_NAME, PORTFOLIO_PREVIEW_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PORTFOLIO_PREVIEW_STORE_NAME)) {
          database.createObjectStore(PORTFOLIO_PREVIEW_STORE_NAME, { keyPath: 'slug' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  private isPreviewEnvelope(value: unknown): value is PreviewEnvelope {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'snapshot' in value &&
        (value as PreviewEnvelope).snapshot,
    );
  }

  private createBroadcastChannel(slug: string) {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return null;
    }

    return new BroadcastChannel(`${PREVIEW_CHANNEL_PREFIX}${slug}`);
  }

  private getPreviewSocketUrl(slug: string) {
    const apiUrl = new URL(environment.apiUrl);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = '/ws/preview';
    apiUrl.search = `slug=${encodeURIComponent(slug)}`;
    return apiUrl.toString();
  }
}
