package com.jmportfolio.jm.testRest;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping
    public Map<String, String> test() {
        return Map.of(
                "status", "OK",
                "message", "Frontend e Backend comunicano correttamente"
        );
    }
}
