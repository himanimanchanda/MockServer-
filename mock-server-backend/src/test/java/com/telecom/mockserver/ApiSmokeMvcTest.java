package com.telecom.mockserver;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive API smoke tests covering all critical endpoints.
 * Uses H2 in-memory DB + in-memory cache (no Redis needed).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiSmokeMvcTest {

    @Autowired
    MockMvc mockMvc;

    // ────── Health & Actuator ──────

    @Test
    void actuator_health_ok() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    // ────── Projects CRUD ──────

    @Test
    void list_projects_ok() throws Exception {
        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void create_project_returns_201() throws Exception {
        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Smoke Test Project\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Smoke Test Project"));
    }

    @Test
    void create_project_blank_name_returns_400() throws Exception {
        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // ────── Mocks CRUD ──────

    @Test
    void list_mocks_ok() throws Exception {
        mockMvc.perform(get("/api/mocks"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void create_mock_returns_201() throws Exception {
        // First create a project to get a valid projectId
        String projectJson = mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"MockTestProject\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // Extract projectId from JSON (simple substring — no Jackson needed in test)
        String projectId = projectJson.split("\"id\"\\s*:\\s*\"")[1].split("\"")[0];

        String payload = """
                {
                    "projectId": "%s",
                    "endpoint": "/smoke/test",
                    "method": "GET",
                    "responseBody": "{\\"status\\":\\"ok\\"}",
                    "statusCode": 200
                }
                """.formatted(projectId);

        mockMvc.perform(post("/api/mocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endpoint").value("/smoke/test"));
    }

    // ────── Logs ──────

    @Test
    void list_logs_ok() throws Exception {
        mockMvc.perform(get("/api/logs").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    // ────── Audit ──────

    @Test
    void audit_logs_endpoint_ok() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    // ────── Mock Engine (catch-all) ──────

    @Test
    void unmatched_mock_returns_404() throws Exception {
        mockMvc.perform(get("/some/random/path/that/doesnt/exist"))
                .andExpect(status().isNotFound());
    }

    // ────── Search ──────

    @Test
    void search_mocks_ok() throws Exception {
        mockMvc.perform(get("/api/mocks/search").param("query", "test"))
                .andExpect(status().isOk());
    }

    // ────── Auth endpoints exist ──────

    @Test
    void login_with_bad_creds_returns_400() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"olmId\":\"nobody\",\"password\":\"wrong\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_and_login() throws Exception {
        // Register a new user
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"olmId\":\"smokeuser\",\"email\":\"smoke@example.com\",\"password\":\"Test1234\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists());

        // Login with same creds
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"olmId\":\"smokeuser\",\"password\":\"Test1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }
}
