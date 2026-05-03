package com.telecom.mockserver.config;

import com.telecom.mockserver.model.*;
import com.telecom.mockserver.repository.EntityAuditLogJpaRepository;
import com.telecom.mockserver.repository.MockJpaRepository;
import com.telecom.mockserver.repository.ProjectJpaRepository;
import com.telecom.mockserver.repository.RequestLogJpaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Seeds rich demo data on first boot (when DB is empty and mockserver.demo.seed=true).
 *
 * Creates 5 projects, 25+ mocks across all environments (DEV/QA/PROD),
 * 50 request logs, and 30 audit trail entries so the UI looks impressive
 * right after `docker compose up --build`.
 */
@Configuration
public class DemoDataSeeder {

    @Bean
    @ConditionalOnProperty(name = "mockserver.demo.seed", havingValue = "true", matchIfMissing = false)
    CommandLineRunner seed(
            ProjectJpaRepository projectRepo,
            MockJpaRepository mockRepo,
            RequestLogJpaRepository logRepo,
            EntityAuditLogJpaRepository auditRepo
    ) {
        return args -> {
            if (projectRepo.count() > 0 || mockRepo.count() > 0) return;

            // ═════════════════════════════════════════════════════════════════
            //  PROJECTS (5)
            // ═════════════════════════════════════════════════════════════════

            UUID p1 = UUID.randomUUID();
            UUID p2 = UUID.randomUUID();
            UUID p3 = UUID.randomUUID();
            UUID p4 = UUID.randomUUID();
            UUID p5 = UUID.randomUUID();

            projectRepo.save(Project.builder().id(p1).name("Demo Ecommerce").createdBy("olm-demo").ownerOlmId("olm-demo").build());
            projectRepo.save(Project.builder().id(p2).name("Demo Payments").createdBy("olm-demo").ownerOlmId("olm-demo").build());
            projectRepo.save(Project.builder().id(p3).name("Demo Telecom").createdBy("olm-demo").ownerOlmId("olm-demo").build());
            projectRepo.save(Project.builder().id(p4).name("Demo Healthcare").createdBy("olm-demo").ownerOlmId("olm-demo").build());
            projectRepo.save(Project.builder().id(p5).name("Demo Fintech").createdBy("olm-demo").ownerOlmId("olm-demo").build());

            List<UUID> allMockIds = new ArrayList<>();

            // ═════════════════════════════════════════════════════════════════
            //  PROJECT 1: Demo Ecommerce — Static, Dynamic, Nested
            // ═════════════════════════════════════════════════════════════════

            allMockIds.add(saveMock(mockRepo, p1, Environment.DEV, HttpMethodType.GET,
                    "/demo/health", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"ok\":true,\"service\":\"mock-server\",\"version\":\"2.0\",\"type\":\"static\"}",
                    0L, "Health check", "Simple static GET for demo/presentation."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.DEV, HttpMethodType.GET,
                    "/demo/projects/{projectId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"message\":\"dynamic path param demo\",\"projectId\":\"{projectId}\"}",
                    0L, "Dynamic segment", "Shows dynamic path matching using {projectId}."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.DEV, HttpMethodType.GET,
                    "/demo/projects/{projectId}/users/{userId}/orders/{orderId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"message\":\"nested dynamic route\",\"projectId\":\"{projectId}\",\"userId\":\"{userId}\",\"orderId\":\"{orderId}\"}",
                    0L, "Nested dynamic", "Nested dynamic route example for demos."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.DEV, HttpMethodType.GET,
                    "/demo/products", 200, "application/json",
                    Map.of("X-Mocked", "true", "X-Total-Count", "42"),
                    "{\"products\":[{\"id\":1,\"name\":\"Laptop Pro 16\",\"price\":1299.99,\"currency\":\"USD\",\"inStock\":true},{\"id\":2,\"name\":\"Wireless Mouse\",\"price\":29.99,\"currency\":\"USD\",\"inStock\":true},{\"id\":3,\"name\":\"USB-C Hub\",\"price\":49.99,\"currency\":\"USD\",\"inStock\":false}],\"total\":42,\"page\":1}",
                    0L, "Product listing", "Returns a paginated product list with realistic data."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.DEV, HttpMethodType.GET,
                    "/demo/products/{productId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"id\":\"{productId}\",\"name\":\"Premium Widget\",\"price\":99.99,\"category\":\"Electronics\",\"rating\":4.5,\"reviews\":128}",
                    0L, "Product detail", "Dynamic product detail with path param."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.QA, HttpMethodType.GET,
                    "/demo/health", 200, "application/json",
                    Map.of("X-Mocked", "true", "X-Env", "QA"),
                    "{\"ok\":true,\"service\":\"mock-server\",\"env\":\"QA\"}",
                    0L, "QA Health check", "Health endpoint scoped to QA environment."));

            allMockIds.add(saveMock(mockRepo, p1, Environment.PROD, HttpMethodType.GET,
                    "/demo/health", 200, "application/json",
                    Map.of("X-Mocked", "true", "X-Env", "PROD"),
                    "{\"ok\":true,\"service\":\"mock-server\",\"env\":\"PROD\",\"region\":\"us-east-1\"}",
                    0L, "PROD Health check", "Health endpoint scoped to PROD environment."));

            // ═════════════════════════════════════════════════════════════════
            //  PROJECT 2: Demo Payments — CRUD examples
            // ═════════════════════════════════════════════════════════════════

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.POST,
                    "/demo/items", 201, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"id\":101,\"status\":\"created\",\"createdAt\":\"{now}\"}",
                    0L, "POST create", "POST create demo with dynamic timestamp."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.PUT,
                    "/demo/items/{id}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"id\":\"{id}\",\"status\":\"updated (PUT)\",\"updatedAt\":\"{now}\"}",
                    0L, "PUT update", "PUT update demo."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.PATCH,
                    "/demo/items/{id}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"id\":\"{id}\",\"status\":\"patched (PATCH)\"}",
                    0L, "PATCH partial update", "PATCH demo."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.DELETE,
                    "/demo/items/{id}", 204, "application/json",
                    Map.of("X-Mocked", "true"),
                    "",
                    0L, "DELETE", "DELETE demo (204 No Content)."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.POST,
                    "/demo/payments", 201, "application/json",
                    Map.of("X-Mocked", "true", "X-Transaction-Id", "{uuid}"),
                    "{\"transactionId\":\"{uuid}\",\"status\":\"PENDING\",\"amount\":150.00,\"currency\":\"USD\",\"createdAt\":\"{now}\"}",
                    100L, "Create payment", "Simulates payment creation with 100ms delay."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.GET,
                    "/demo/payments/{txnId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"transactionId\":\"{txnId}\",\"status\":\"COMPLETED\",\"amount\":150.00,\"currency\":\"USD\",\"paidAt\":\"{now}\"}",
                    0L, "Get payment status", "Dynamic payment lookup by transaction ID."));

            allMockIds.add(saveMock(mockRepo, p2, Environment.DEV, HttpMethodType.GET,
                    "/demo/payments/{txnId}/receipt", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"txnId\":\"{txnId}\",\"receiptNo\":\"RCP-2025-0042\",\"total\":150.00,\"tax\":12.50,\"downloadUrl\":\"/receipts/{txnId}.pdf\"}",
                    0L, "Payment receipt", "Nested payment receipt endpoint."));

            // ═════════════════════════════════════════════════════════════════
            //  PROJECT 3: Demo Telecom — 3xx/4xx/5xx examples
            // ═════════════════════════════════════════════════════════════════

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.GET,
                    "/demo/redirect", 302, "application/json",
                    Map.of("Location", "/demo/health", "X-Mocked", "true"),
                    "{\"message\":\"redirecting\"}",
                    0L, "302 redirect", "3xx redirect demo."));

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.POST,
                    "/demo/validate", 400, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"error\":\"Bad Request\",\"message\":\"invalid payload\",\"code\":\"VALIDATION_ERROR\",\"fields\":[{\"field\":\"email\",\"error\":\"must be valid\"},{\"field\":\"age\",\"error\":\"must be >= 18\"}]}",
                    0L, "400 validation", "400 demo with detailed field errors."));

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.GET,
                    "/demo/not-found", 404, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"error\":\"Not Found\",\"message\":\"The requested resource does not exist\",\"code\":\"RESOURCE_NOT_FOUND\"}",
                    0L, "404 not found", "404 error demo."));

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.GET,
                    "/demo/server-error", 500, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"error\":\"Internal Server Error\",\"message\":\"Something went wrong on our end\",\"code\":\"INTERNAL_ERROR\",\"traceId\":\"{uuid}\"}",
                    200L, "500 server error", "500 error demo with simulated 200ms latency."));

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.GET,
                    "/demo/plans", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"plans\":[{\"id\":\"basic\",\"name\":\"Basic\",\"data\":\"2GB\",\"price\":199},{\"id\":\"standard\",\"name\":\"Standard\",\"data\":\"5GB\",\"price\":399},{\"id\":\"premium\",\"name\":\"Premium\",\"data\":\"Unlimited\",\"price\":799}]}",
                    0L, "Telecom plans", "Lists available mobile plans."));

            allMockIds.add(saveMock(mockRepo, p3, Environment.DEV, HttpMethodType.GET,
                    "/demo/subscribers/{msisdn}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"msisdn\":\"{msisdn}\",\"name\":\"Rahul Sharma\",\"plan\":\"Premium\",\"balance\":450.50,\"status\":\"ACTIVE\"}",
                    0L, "Subscriber lookup", "Dynamic subscriber lookup by MSISDN."));

            // ═════════════════════════════════════════════════════════════════
            //  PROJECT 4: Demo Healthcare — Medical APIs
            // ═════════════════════════════════════════════════════════════════

            allMockIds.add(saveMock(mockRepo, p4, Environment.DEV, HttpMethodType.GET,
                    "/demo/patients/{patientId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"patientId\":\"{patientId}\",\"name\":\"Ankit Verma\",\"age\":32,\"bloodGroup\":\"O+\",\"lastVisit\":\"2025-04-28\",\"status\":\"ACTIVE\"}",
                    0L, "Patient detail", "Dynamic patient lookup."));

            allMockIds.add(saveMock(mockRepo, p4, Environment.DEV, HttpMethodType.GET,
                    "/demo/patients/{patientId}/prescriptions", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"patientId\":\"{patientId}\",\"prescriptions\":[{\"id\":\"RX001\",\"drug\":\"Amoxicillin 500mg\",\"dosage\":\"3x daily\",\"days\":7},{\"id\":\"RX002\",\"drug\":\"Paracetamol 650mg\",\"dosage\":\"as needed\",\"days\":5}]}",
                    0L, "Patient prescriptions", "Nested patient prescriptions route."));

            allMockIds.add(saveMock(mockRepo, p4, Environment.DEV, HttpMethodType.POST,
                    "/demo/appointments", 201, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"appointmentId\":\"{uuid}\",\"doctor\":\"Dr. Priya Singh\",\"department\":\"Cardiology\",\"scheduledAt\":\"2025-05-10T10:30:00Z\",\"status\":\"CONFIRMED\"}",
                    0L, "Book appointment", "Creates a new appointment with dynamic UUID."));

            allMockIds.add(saveMock(mockRepo, p4, Environment.QA, HttpMethodType.GET,
                    "/demo/patients/{patientId}", 200, "application/json",
                    Map.of("X-Mocked", "true", "X-Env", "QA"),
                    "{\"patientId\":\"{patientId}\",\"name\":\"QA Test Patient\",\"age\":25,\"bloodGroup\":\"A+\",\"status\":\"ACTIVE\",\"env\":\"QA\"}",
                    0L, "QA Patient detail", "Patient lookup in QA environment."));

            // ═════════════════════════════════════════════════════════════════
            //  PROJECT 5: Demo Fintech — Banking & Investments
            // ═════════════════════════════════════════════════════════════════

            allMockIds.add(saveMock(mockRepo, p5, Environment.DEV, HttpMethodType.GET,
                    "/demo/accounts/{accountId}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"accountId\":\"{accountId}\",\"holder\":\"Vikram Mehta\",\"type\":\"SAVINGS\",\"balance\":125430.75,\"currency\":\"INR\",\"branch\":\"Mumbai-Andheri\"}",
                    0L, "Account detail", "Dynamic bank account lookup."));

            allMockIds.add(saveMock(mockRepo, p5, Environment.DEV, HttpMethodType.GET,
                    "/demo/accounts/{accountId}/transactions", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"accountId\":\"{accountId}\",\"transactions\":[{\"txnId\":\"TXN001\",\"type\":\"CREDIT\",\"amount\":50000,\"description\":\"Salary\",\"date\":\"2025-04-30\"},{\"txnId\":\"TXN002\",\"type\":\"DEBIT\",\"amount\":3500,\"description\":\"Electricity Bill\",\"date\":\"2025-04-28\"},{\"txnId\":\"TXN003\",\"type\":\"DEBIT\",\"amount\":1200,\"description\":\"Amazon Purchase\",\"date\":\"2025-04-27\"}]}",
                    0L, "Account transactions", "Nested transaction history."));

            allMockIds.add(saveMock(mockRepo, p5, Environment.DEV, HttpMethodType.POST,
                    "/demo/transfers", 201, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"transferId\":\"{uuid}\",\"status\":\"SUCCESS\",\"amount\":10000,\"from\":\"ACC-001\",\"to\":\"ACC-002\",\"completedAt\":\"{now}\"}",
                    150L, "Fund transfer", "Simulates NEFT/IMPS transfer with 150ms delay."));

            allMockIds.add(saveMock(mockRepo, p5, Environment.DEV, HttpMethodType.GET,
                    "/demo/market/stocks/{symbol}", 200, "application/json",
                    Map.of("X-Mocked", "true"),
                    "{\"symbol\":\"{symbol}\",\"name\":\"Reliance Industries\",\"price\":2845.60,\"change\":\"+1.25%\",\"volume\":1250000,\"lastUpdated\":\"{now}\"}",
                    0L, "Stock quote", "Dynamic stock quote by symbol."));

            allMockIds.add(saveMock(mockRepo, p5, Environment.PROD, HttpMethodType.GET,
                    "/demo/accounts/{accountId}", 200, "application/json",
                    Map.of("X-Mocked", "true", "X-Env", "PROD"),
                    "{\"accountId\":\"{accountId}\",\"holder\":\"Production Account\",\"type\":\"CURRENT\",\"balance\":500000.00,\"currency\":\"INR\",\"env\":\"PROD\"}",
                    0L, "PROD Account detail", "Account lookup in PROD environment."));

            // ═════════════════════════════════════════════════════════════════
            //  REQUEST LOGS (50 entries)
            // ═════════════════════════════════════════════════════════════════

            Instant now = Instant.now();
            String[] logEndpoints = {
                    "/demo/health", "/demo/products", "/demo/products/42",
                    "/demo/projects/abc123", "/demo/items", "/demo/payments",
                    "/demo/payments/txn-001", "/demo/plans", "/demo/subscribers/9876543210",
                    "/demo/patients/P001", "/demo/patients/P001/prescriptions",
                    "/demo/accounts/ACC001", "/demo/accounts/ACC001/transactions",
                    "/demo/transfers", "/demo/market/stocks/RELIANCE",
                    "/demo/redirect", "/demo/validate", "/demo/not-found",
                    "/demo/server-error", "/demo/appointments",
                    "/users/123", "/api/unknown-endpoint"
            };
            String[] logMethods = {"GET", "POST", "PUT", "DELETE", "PATCH", "GET", "GET", "GET"};
            Integer[] statusCodes = {200, 201, 200, 204, 200, 200, 302, 400, 404, 500, 200, 200};

            for (int i = 0; i < 50; i++) {
                Instant logTs = now.minus(50 - i, ChronoUnit.MINUTES);
                String ep = logEndpoints[i % logEndpoints.length];
                String method = logMethods[i % logMethods.length];
                int status = statusCodes[i % statusCodes.length];
                boolean matched = status != 404 && i % 7 != 0; // ~15% unmatched
                UUID mockId = matched && !allMockIds.isEmpty()
                        ? allMockIds.get(i % allMockIds.size())
                        : null;

                logRepo.save(RequestLog.builder()
                        .endpoint(ep)
                        .method(method)
                        .timestamp(logTs)
                        .matchedMockId(mockId)
                        .requestHeaders("{\"content-type\":\"application/json\",\"user-agent\":\"PostmanRuntime/7.36\"}")
                        .requestBody(method.equals("POST") || method.equals("PUT") ? "{\"demo\":true}" : null)
                        .queryParams(i % 5 == 0 ? "{\"page\":\"1\",\"limit\":\"10\"}" : null)
                        .responseBody(matched ? "{\"status\":\"ok\",\"mocked\":true}" : null)
                        .responseStatusCode(status)
                        .matched(matched)
                        .build());
            }

            // ═════════════════════════════════════════════════════════════════
            //  AUDIT TRAIL (30 entries)
            // ═════════════════════════════════════════════════════════════════

            UUID[] projectIds = {p1, p2, p3, p4, p5};
            String[] projectNames = {"Demo Ecommerce", "Demo Payments", "Demo Telecom", "Demo Healthcare", "Demo Fintech"};

            // Project creation audits
            for (int i = 0; i < 5; i++) {
                auditRepo.save(EntityAuditLog.builder()
                        .performedAt(now.minus(60 - i, ChronoUnit.MINUTES))
                        .entityType("PROJECT")
                        .entityId(projectIds[i].toString())
                        .action(AuditAction.CREATE)
                        .actorOlmId("olm-demo")
                        .summary("Created project: " + projectNames[i])
                        .build());
            }

            // Mock CRUD audits
            for (int i = 0; i < 20; i++) {
                AuditAction action;
                String summary;
                if (i < 12) {
                    action = AuditAction.CREATE;
                    summary = "GET /demo/endpoint-" + i + " [DEV]";
                } else if (i < 16) {
                    action = AuditAction.UPDATE;
                    summary = "Updated mock response body";
                } else if (i < 18) {
                    action = AuditAction.DELETE;
                    summary = "soft-delete";
                } else {
                    action = AuditAction.RECOVER;
                    summary = "restored from trash";
                }

                UUID mockId = allMockIds.get(i % allMockIds.size());
                auditRepo.save(EntityAuditLog.builder()
                        .performedAt(now.minus(55 - i * 2L, ChronoUnit.MINUTES))
                        .entityType("MOCK")
                        .entityId(mockId.toString())
                        .action(action)
                        .actorOlmId(i % 3 == 0 ? "olm-admin" : "olm-demo")
                        .summary(summary)
                        .build());
            }

            // A few more project audits (update/delete scenarios)
            auditRepo.save(EntityAuditLog.builder()
                    .performedAt(now.minus(10, ChronoUnit.MINUTES))
                    .entityType("PROJECT")
                    .entityId(UUID.randomUUID().toString())
                    .action(AuditAction.DELETE)
                    .actorOlmId("olm-admin")
                    .summary("Deleted project: Old Test Project")
                    .build());

            auditRepo.save(EntityAuditLog.builder()
                    .performedAt(now.minus(8, ChronoUnit.MINUTES))
                    .entityType("MOCK")
                    .entityId(allMockIds.get(0).toString())
                    .action(AuditAction.UPDATE)
                    .actorOlmId("olm-admin")
                    .summary("Updated status code from 200 to 201")
                    .build());

            auditRepo.save(EntityAuditLog.builder()
                    .performedAt(now.minus(5, ChronoUnit.MINUTES))
                    .entityType("MOCK")
                    .entityId(allMockIds.get(2).toString())
                    .action(AuditAction.UPDATE)
                    .actorOlmId("olm-demo")
                    .summary("Added response headers")
                    .build());

            auditRepo.save(EntityAuditLog.builder()
                    .performedAt(now.minus(3, ChronoUnit.MINUTES))
                    .entityType("PROJECT")
                    .entityId(p5.toString())
                    .action(AuditAction.CREATE)
                    .actorOlmId("system")
                    .summary("Auto-created project: Demo Fintech")
                    .build());

            auditRepo.save(EntityAuditLog.builder()
                    .performedAt(now.minus(1, ChronoUnit.MINUTES))
                    .entityType("MOCK")
                    .entityId(allMockIds.get(allMockIds.size() - 1).toString())
                    .action(AuditAction.CREATE)
                    .actorOlmId("system")
                    .summary("Seed completed — all demo mocks loaded")
                    .build());
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  HELPER
    // ═══════════════════════════════════════════════════════════════════════

    private UUID saveMock(
            MockJpaRepository mockRepo,
            UUID projectId,
            Environment env,
            HttpMethodType method,
            String endpoint,
            int statusCode,
            String contentType,
            Map<String, String> responseHeaders,
            String responseBody,
            long delayMs,
            String testCase,
            String description
    ) {
        UUID id = UUID.randomUUID();
        mockRepo.save(Mock.builder()
                .id(id)
                .projectId(projectId)
                .environment(env)
                .method(method)
                .endpoint(endpoint)
                .statusCode(statusCode)
                .contentType(contentType)
                .responseHeaders(responseHeaders)
                .responseBody(responseBody)
                .delayMs(delayMs)
                .testCase(testCase)
                .description(description)
                .build());
        return id;
    }
}
