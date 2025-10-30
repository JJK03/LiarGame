package com.example.server.repository;

import com.example.server.model.DomainModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Repository extends JpaRepository<DomainModel, Long> {
    // Custom query methods can be defined here
}