package com.telecom.mockserver.engine;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
public class TestRunner {
    public static void main(String[] args) throws Exception {
        JsonSubsetMatcher matcher = new JsonSubsetMatcher();
        ObjectMapper mapper = new ObjectMapper();
        JsonNode e = mapper.readTree("{\"cartId\": \"$\", \"total\": \"$\"}");
        JsonNode a = mapper.readTree("{\"cartId\": \"ABC-12345\", \"total\": 999.00}");
        System.out.println("Result: " + matcher.matches(e, a));
    }
}
