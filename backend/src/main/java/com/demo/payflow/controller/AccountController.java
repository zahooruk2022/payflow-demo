package com.demo.payflow.controller;

import com.demo.payflow.model.Account;
import com.demo.payflow.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public List<Account> getAll() {
        return accountService.getAllAccounts();
    }

    @GetMapping("/{id}")
    public Account getOne(@PathVariable String id) {
        return accountService.getAccount(id);
    }
}
