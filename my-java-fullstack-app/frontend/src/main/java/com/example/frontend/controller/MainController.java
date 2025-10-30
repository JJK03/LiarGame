package com.example.frontend.controller;

import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

public class MainController {

    @FXML
    private Label welcomeLabel;

    @FXML
    private Button clickMeButton;

    @FXML
    private void handleClickMeButtonAction() {
        welcomeLabel.setText("Hello, World!");
    }
}