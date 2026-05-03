import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

public class TestMatcher {
    public static void main(String[] args) throws Exception {
        com.telecom.mockserver.engine.JsonSubsetMatcher matcher = new com.telecom.mockserver.engine.JsonSubsetMatcher();
        ObjectMapper mapper = new ObjectMapper();
        
        String expectedStr = "{\"cartId\": \"$\", \"total\": \"$\"}";
        String actualStr = "{\"cartId\": \"ABC-12345\", \"total\": 999.00}";
        
        JsonNode expected = mapper.readTree(expectedStr);
        JsonNode actual = mapper.readTree(actualStr);
        
        System.out.println("Match result: " + matcher.matches(expected, actual));
    }
}
