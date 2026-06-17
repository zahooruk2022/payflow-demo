package com.demo.payflow.controller;

import com.demo.payflow.dto.PaymentRequest;
import com.demo.payflow.model.Transaction;
import com.demo.payflow.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Transaction submit(@Valid @RequestBody PaymentRequest request) {
        return paymentService.submitPayment(request);
    }

    @GetMapping
    public List<Transaction> recent(@RequestParam(defaultValue = "50") int limit) {
        return paymentService.getRecentTransactions(limit);
    }
}
