package com.demo.payflow.controller;

import com.demo.payflow.dto.DashboardStats;
import com.demo.payflow.model.FraudAlert;
import com.demo.payflow.repository.FraudAlertRepository;
import com.demo.payflow.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final PaymentService paymentService;
    private final FraudAlertRepository fraudAlertRepository;

    @GetMapping("/stats")
    public DashboardStats stats() {
        return paymentService.getStats();
    }

    @GetMapping("/alerts")
    public List<FraudAlert> alerts(@RequestParam(defaultValue = "20") int limit) {
        return fraudAlertRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }
}
