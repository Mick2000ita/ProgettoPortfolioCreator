package com.jmportfolio.jm.domains.portfolios.infrastructure.live;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class PortfolioPreviewWebSocketHandler extends TextWebSocketHandler {
    private static final String SLUG_ATTRIBUTE = "previewSlug";

    private final Map<String, Set<WebSocketSession>> sessionsBySlug = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String slug = getSlug(session.getUri());
        if (slug == null || slug.isBlank()) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        session.getAttributes().put(SLUG_ATTRIBUTE, slug);
        sessionsBySlug.computeIfAbsent(slug, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String slug = (String) session.getAttributes().get(SLUG_ATTRIBUTE);
        if (slug == null || slug.isBlank()) {
            return;
        }

        Set<WebSocketSession> sessions = sessionsBySlug.getOrDefault(slug, Set.of());
        sessions.removeIf(currentSession -> !currentSession.isOpen());
        sessions.forEach(currentSession -> sendSnapshot(currentSession, message));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String slug = (String) session.getAttributes().get(SLUG_ATTRIBUTE);
        if (slug == null) {
            return;
        }

        Set<WebSocketSession> sessions = sessionsBySlug.get(slug);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsBySlug.remove(slug);
        }
    }

    private void sendSnapshot(WebSocketSession session, TextMessage message) {
        try {
            if (session.isOpen()) {
                session.sendMessage(message);
            }
        } catch (Exception ignored) {
            try {
                session.close(CloseStatus.SERVER_ERROR);
            } catch (Exception closeException) {
                // Session cleanup runs on close.
            }
        }
    }

    private String getSlug(URI uri) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }

        for (String parameter : uri.getQuery().split("&")) {
            String[] parts = parameter.split("=", 2);
            if (parts.length == 2 && parts[0].equals("slug")) {
                return URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
            }
        }

        return null;
    }
}
