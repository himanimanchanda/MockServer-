package com.telecom.mockserver.engine;

import com.telecom.mockserver.model.Mock;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class MockMatch {
    private Mock mock;
    private Map<String, String> pathParams;
    private int score;
}

