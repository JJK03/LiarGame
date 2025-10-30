package com.example.server.service;

import org.springframework.stereotype.Service;

@Service
public class ApiService {
    
    public String processRequest(String request) {
        // Business logic to process the request
        return "Processed: " + request;
    }
}