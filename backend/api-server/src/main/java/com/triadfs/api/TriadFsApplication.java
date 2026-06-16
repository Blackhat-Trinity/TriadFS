package com.triadfs.api;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.triadfs")
@EntityScan(basePackages = "com.triadfs.metadata.model")
@EnableJpaRepositories(basePackages = "com.triadfs.metadata.repository")
public class TriadFsApplication {
    public static void main(String[] args) {
        SpringApplication.run(TriadFsApplication.class, args);
    }
}
