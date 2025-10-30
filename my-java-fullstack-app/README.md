# My Java Fullstack Application

This project is a full-stack Java application consisting of a frontend and a server component. Below are the details for setting up and running the application.

## Project Structure

```
my-java-fullstack-app
├── pom.xml
├── .gitignore
├── README.md
├── frontend
│   ├── pom.xml
│   └── src
│       ├── main
│       │   ├── java
│       │   │   └── com
│       │   │       └── example
│       │   │           └── frontend
│       │   │               ├── MainApp.java
│       │   │               ├── controller
│       │   │               │   └── MainController.java
│       │   │               └── model
│       │   │                   └── DomainModel.java
│       │   └── resources
│       │       ├── fxml
│       │       │   └── main.fxml
│       │       └── application.properties
│       └── test
│           └── java
│               └── com
│                   └── example
│                       └── frontend
│                           └── MainAppTest.java
└── server
    ├── pom.xml
    └── src
        ├── main
        │   ├── java
        │   │   └── com
        │   │       └── example
        │   │           └── server
        │   │               ├── Application.java
        │   │               ├── controller
        │   │               │   └── ApiController.java
        │   │               ├── service
        │   │               │   └── ApiService.java
        │   │               ├── repository
        │   │               │   └── Repository.java
        │   │               └── model
        │   │                   └── DomainModel.java
        │   └── resources
        │       ├── application.yml
        │       └── static
        └── test
            └── java
                └── com
                    └── example
                        └── server
                            └── ApplicationTests.java
```

## Setup Instructions

### Prerequisites

- Java Development Kit (JDK) 11 or higher
- Apache Maven
- An IDE or text editor of your choice

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

2. Build the frontend application:
   ```
   mvn clean install
   ```

3. Run the frontend application:
   ```
   mvn javafx:run
   ```

### Server Setup

1. Navigate to the `server` directory:
   ```
   cd server
   ```

2. Build the server application:
   ```
   mvn clean install
   ```

3. Run the server application:
   ```
   mvn spring-boot:run
   ```

## Usage Guidelines

- The frontend application communicates with the server via RESTful APIs.
- Ensure that the server is running before starting the frontend application.
- Modify the configuration files located in `frontend/src/main/resources/application.properties` and `server/src/main/resources/application.yml` as needed for your environment.

## Contributing

Feel free to fork the repository and submit pull requests for any improvements or bug fixes.