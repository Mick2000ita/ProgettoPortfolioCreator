import { Injectable, computed, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';

export type ContentType = 'title' | 'description' | 'cv' | 'image' | 'table' | 'background';

export const DEFAULT_BACKGROUND_COLOR = '#081111';

export interface ContentOption {
  value: ContentType;
  label: string;
  description: string;
  icon: string;
}

export interface EditorNodeData {
  type: ContentType;
  label: string;
  textValue: string;
  colorValue: string;
  fileName: string;
  fileData: string;
  images: string[];
  importSourceKey?: string;
  layout: EditorNodeLayout;
}

export interface EditorNodeLayout {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
}

export const PORTFOLIO_EDITOR_CONTENT_OPTIONS: ContentOption[] = [
  {
    value: 'title',
    label: 'Titolo',
    description: 'Headline principale del portfolio.',
    icon: 'pi pi-heading'
  },
  {
    value: 'description',
    label: 'Descrizione',
    description: 'Testi introduttivi o blocchi editoriali.',
    icon: 'pi pi-align-left'
  },
  {
    value: 'cv',
    label: 'CV',
    description: 'Curriculum con testo modificabile e file scaricabile.',
    icon: 'pi pi-file-pdf'
  },
  {
    value: 'image',
    label: 'Immagini',
    description: 'Gallerie visive e contenuti visuali.',
    icon: 'pi pi-images'
  },
  {
    value: 'table',
    label: 'Tabella',
    description: 'Tabelle, listini e contenuti strutturati in righe e colonne.',
    icon: 'pi pi-table'
  },
  {
    value: 'background',
    label: 'Background',
    description: 'Colore di atmosfera per la pagina pubblica.',
    icon: 'pi pi-palette'
  }
];

@Injectable({
  providedIn: 'root'
})
export class PortfolioEditorStateService {
  readonly treeNodes = signal<TreeNode<EditorNodeData>[]>([]);
  readonly selectedTreeNode = signal<TreeNode<EditorNodeData> | null>(null);
  readonly flatNodes = computed(() => this.flattenTreeNodes(this.treeNodes()));
  readonly nodeCount = computed(() => this.flatNodes().length);

  setTreeNodes(nodes: TreeNode<EditorNodeData>[]) {
    this.treeNodes.set(this.ensureBackgroundRoot(nodes));
  }

  onSelectionChange(
    selection: TreeNode<EditorNodeData> | TreeNode<EditorNodeData>[] | null | undefined
  ) {
    const node = Array.isArray(selection) ? (selection[0] ?? null) : (selection ?? null);
    this.selectedTreeNode.set(node);
  }

  addNode(type: ContentType) {
    if (type === 'background') {
      return null;
    }

    const newNode = this.createTreeNode(type);
    const selectedTreeNode = this.selectedTreeNode();
    const roots = [...this.treeNodes()];

    if (selectedTreeNode) {
      selectedTreeNode.children = [...(selectedTreeNode.children ?? []), newNode];
      selectedTreeNode.expanded = true;
    } else {
      roots.push(newNode);
      this.treeNodes.set(roots);
    }

    this.refreshTree();
    this.selectNodeByKey(newNode.key ?? null);
    return newNode;
  }

  canRemoveSelectedNode() {
    return this.selectedTreeNode()?.data?.type !== 'background' && Boolean(this.selectedTreeNode()?.key);
  }

  removeSelectedNode() {
    const selectedKey = this.selectedTreeNode()?.key;
    if (!selectedKey || !this.canRemoveSelectedNode()) {
      return;
    }

    this.treeNodes.set(this.removeNodeByKey(this.treeNodes(), selectedKey));
    this.selectedTreeNode.set(null);
  }

  onNodeDrop(event: { accept?: Function }) {
    event.accept?.();
    queueMicrotask(() => {
      this.refreshTree();
    });
  }

  refreshTree() {
    const selectedKey = this.selectedTreeNode()?.key ?? null;
    this.treeNodes.set(this.cloneTreeNodes(this.treeNodes()));
    this.selectNodeByKey(selectedKey);
  }

  selectNodeByKey(key: string | null) {
    if (!key) {
      this.selectedTreeNode.set(null);
      return;
    }

    this.selectedTreeNode.set(this.findNodeByKey(this.treeNodes(), key));
  }

  getContentTypeLabel(type: ContentType) {
    return PORTFOLIO_EDITOR_CONTENT_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  getTreeNodeIcon(type: ContentType) {
    return PORTFOLIO_EDITOR_CONTENT_OPTIONS.find((option) => option.value === type)?.icon ?? 'pi pi-folder';
  }

  getDefaultLayout(type: ContentType): EditorNodeLayout {
    switch (type) {
      case 'title':
        return { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 };
      case 'description':
        return { columnStart: 1, rowStart: 3, columnSpan: 6, rowSpan: 3 };
      case 'image':
        return { columnStart: 1, rowStart: 1, columnSpan: 6, rowSpan: 4 };
      case 'table':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 5 };
      case 'cv':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 5 };
      case 'background':
      default:
        return { columnStart: 1, rowStart: 1, columnSpan: 12, rowSpan: 1 };
    }
  }

  createTreeNode(type: ContentType): TreeNode<EditorNodeData> {
    return {
      key: this.generateNodeKey(),
      label: this.getContentTypeLabel(type),
      icon: this.getTreeNodeIcon(type),
      expanded: true,
      selectable: true,
      draggable: type !== 'background',
      droppable: true,
      data: {
        type,
        label: this.getContentTypeLabel(type),
        textValue: '',
        colorValue: DEFAULT_BACKGROUND_COLOR,
        fileName: '',
        fileData: '',
        images: [],
        importSourceKey: undefined,
        layout: this.getDefaultLayout(type)
      },
      children: []
    };
  }

  reset() {
    this.treeNodes.set([]);
    this.selectedTreeNode.set(null);
  }

  private ensureBackgroundRoot(nodes: TreeNode<EditorNodeData>[]) {
    const backgroundIndex = nodes.findIndex((node) => node.data?.type === 'background');
    if (backgroundIndex >= 0) {
      const backgroundNode = nodes[backgroundIndex];
      const remainingNodes = nodes.filter((_node, index) => index !== backgroundIndex);
      return [backgroundNode, ...remainingNodes];
    }

    return [this.createTreeNode('background'), ...nodes];
  }

  private removeNodeByKey(nodes: TreeNode<EditorNodeData>[], key: string): TreeNode<EditorNodeData>[] {
    return nodes
      .filter((node) => node.key !== key)
      .map((node) => ({
        ...node,
        data: node.data ? { ...node.data } : undefined,
        children: this.removeNodeByKey(node.children ?? [], key)
      }));
  }

  private flattenTreeNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.flatMap((node) => [node, ...this.flattenTreeNodes(node.children ?? [])]);
  }

  private cloneTreeNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.map((node) => ({
      ...node,
      data: node.data
        ? {
            ...node.data,
            images: [...node.data.images],
            importSourceKey: node.data.importSourceKey,
            layout: { ...node.data.layout }
          }
        : undefined,
      children: this.cloneTreeNodes(node.children ?? [])
    }));
  }

  private findNodeByKey(
    nodes: TreeNode<EditorNodeData>[],
    key: string
  ): TreeNode<EditorNodeData> | null {
    for (const node of nodes) {
      if (node.key === key) {
        return node;
      }

      const childMatch = this.findNodeByKey(node.children ?? [], key);
      if (childMatch) {
        return childMatch;
      }
    }

    return null;
  }

  private generateNodeKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
