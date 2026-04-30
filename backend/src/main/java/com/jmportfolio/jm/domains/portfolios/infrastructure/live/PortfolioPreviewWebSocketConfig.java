package com.jmportfolio.jm.domains.portfolios.infrastructure.live;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class PortfolioPreviewWebSocketConfig implements WebSocketConfigurer {
    private final PortfolioPreviewWebSocketHandler portfolioPreviewWebSocketHandler;

    public PortfolioPreviewWebSocketConfig(
            PortfolioPreviewWebSocketHandler portfolioPreviewWebSocketHandler) {
        this.portfolioPreviewWebSocketHandler = portfolioPreviewWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(portfolioPreviewWebSocketHandler, "/ws/preview")
                .setAllowedOrigins("*");
    }
}
