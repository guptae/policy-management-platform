package com.abc.policymanagement.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests for {@code /api/v1/policies} against a real PostgreSQL container with Flyway
 * migrations applied (V1 schema, V2 seed of 210 policies).
 *
 * <p>Seeded dates are relative to the day the migration runs, so date-dependent expectations are
 * computed from the database rather than hard-coded.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class PolicyControllerIntegrationTest {

    private static final String BASE_PATH = "/api/v1/policies";
    private static final String TANAKA_POLICY_NUMBER = "POL-000022";

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ---------------------------------------------------------------------
    // GET /api/v1/policies
    // ---------------------------------------------------------------------

    @Test
    void listWithoutFiltersReturnsFirstPageOfTwentyWithFullTotals() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH), 200);

        assertThat(body.get("content").size()).isEqualTo(20);
        assertThat(body.get("page").asInt()).isZero();
        assertThat(body.get("size").asInt()).isEqualTo(20);
        assertThat(body.get("totalElements").asLong()).isEqualTo(210);
        assertThat(body.get("totalPages").asInt()).isEqualTo(11);
    }

    @Test
    void statusFilterReturnsOnlyActivePolicies() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH)
                .param("status", "Active")
                .param("size", "100"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(94);
        assertThat(body.get("content").size()).isEqualTo(94);
        for (JsonNode item : body.get("content")) {
            assertThat(item.get("status").asText()).isEqualTo("Active");
        }
    }

    @Test
    void lineOfBusinessLabelWithAmpersandCombinedWithStatusFiltersInDatabase() throws Exception {
        long expected = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM policies WHERE status = ? AND line_of_business = ?",
                Long.class, "ACTIVE", "AH");

        JsonNode body = expectJson(get(BASE_PATH)
                .param("lineOfBusiness", "A&H")
                .param("status", "Active")
                .param("size", "250"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(expected);
        assertThat(body.get("content").size()).isEqualTo((int) expected);
        for (JsonNode item : body.get("content")) {
            assertThat(item.get("lineOfBusiness").asText()).isEqualTo("A&H");
            assertThat(item.get("status").asText()).isEqualTo("Active");
        }
    }

    @Test
    void searchIsCaseInsensitiveAndMatchesPolicyholderName() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH).param("search", "tanaka"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(1);
        assertThat(body.get("content").size()).isEqualTo(1);
        JsonNode match = body.get("content").get(0);
        assertThat(match.get("policyholderName").asText()).isEqualTo("Tanaka Hiroshi");
        assertThat(match.get("policyNumber").asText()).isEqualTo(TANAKA_POLICY_NUMBER);
    }

    @Test
    void searchWithNoMatchReturnsEmptyPage() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH).param("search", "zz-no-such-policyholder"), 200);

        assertThat(body.get("totalElements").asLong()).isZero();
        assertThat(body.get("totalPages").asInt()).isZero();
        assertThat(body.get("content").size()).isZero();
    }

    @Test
    void sortByPremiumDescendingReturnsNonIncreasingValuesWithMaximumFirst() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH).param("sort", "premiumAmount,desc"), 200);

        List<BigDecimal> premiums = new ArrayList<>();
        for (JsonNode item : body.get("content")) {
            premiums.add(item.get("premiumAmount").decimalValue());
        }
        assertThat(premiums).hasSize(20);
        for (int i = 1; i < premiums.size(); i++) {
            assertThat(premiums.get(i).compareTo(premiums.get(i - 1)))
                    .as("premium at index %d should not exceed index %d", i, i - 1)
                    .isLessThanOrEqualTo(0);
        }
        assertThat(premiums.get(0)).isEqualByComparingTo("5000000.00");
    }

    @Test
    void pageBeyondLastReturnsEmptyContentButKeepsTotals() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH).param("page", "11"), 200);

        assertThat(body.get("content").size()).isZero();
        assertThat(body.get("page").asInt()).isEqualTo(11);
        assertThat(body.get("totalElements").asLong()).isEqualTo(210);
        assertThat(body.get("totalPages").asInt()).isEqualTo(11);
    }

    @Test
    void effectiveDateFromOlderBoundReturnsPoliciesOnOrAfterThatDate() throws Exception {
        LocalDate from = LocalDate.of(2024, 1, 1);
        long expected = countEffectiveOnOrAfter(from);

        JsonNode body = expectJson(get(BASE_PATH)
                .param("effectiveDateFrom", "2024-01-01")
                .param("size", "250"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(expected);
        assertThat((long) body.get("content").size()).isEqualTo(expected);
        for (JsonNode item : body.get("content")) {
            assertThat(LocalDate.parse(item.get("effectiveDate").asText())).isAfterOrEqualTo(from);
        }
    }

    @Test
    void effectiveDateFromTodayReturnsPoliciesOnOrAfterToday() throws Exception {
        LocalDate today = LocalDate.now();
        long expected = countEffectiveOnOrAfter(today);

        JsonNode body = expectJson(get(BASE_PATH)
                .param("effectiveDateFrom", today.toString())
                .param("size", "250"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(expected);
        assertThat((long) body.get("content").size()).isEqualTo(expected);
        for (JsonNode item : body.get("content")) {
            assertThat(LocalDate.parse(item.get("effectiveDate").asText())).isAfterOrEqualTo(today);
        }
    }

    @Test
    void invalidStatusLabelIsRejectedWithBadRequest() throws Exception {
        mockMvc.perform(get(BASE_PATH).param("status", "Bogus"))
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------------
    // GET /api/v1/policies/{id}
    // ---------------------------------------------------------------------

    @Test
    void getByIdReturnsAllFieldsForSeededPolicy() throws Exception {
        String id = tanakaPolicyId();

        JsonNode body = expectJson(get(BASE_PATH + "/" + id), 200);

        List<String> expectedFields = List.of(
                "id", "policyNumber", "policyholderName", "status", "lineOfBusiness",
                "premiumAmount", "currency", "effectiveDate", "expiryDate", "region",
                "underwriter", "flaggedForReview", "createdAt", "updatedAt");
        for (String field : expectedFields) {
            assertThat(body.has(field)).as("response should contain field '%s'", field).isTrue();
        }

        assertThat(body.get("id").asText()).isEqualTo(id);
        assertThat(body.get("policyNumber").asText()).isEqualTo(TANAKA_POLICY_NUMBER);
        assertThat(body.get("policyholderName").asText()).isEqualTo("Tanaka Hiroshi");
        assertThat(body.get("status").asText()).isEqualTo("Active");
        assertThat(body.get("lineOfBusiness").asText()).isEqualTo("A&H");
        assertThat(body.get("premiumAmount").decimalValue()).isEqualByComparingTo("7270.00");
        assertThat(body.get("currency").asText()).isEqualTo("JPY");
        assertThat(body.get("region").asText()).isEqualTo("Japan");
        assertThat(body.get("underwriter").asText()).isEqualTo("Okada Shinji");
        assertThat(body.get("flaggedForReview").asBoolean()).isFalse();
    }

    @Test
    void getByUnknownIdReturnsProblemDetailNotFound() throws Exception {
        String unknownId = UUID.randomUUID().toString();

        JsonNode body = expectProblem(get(BASE_PATH + "/" + unknownId), 404);

        assertThat(body.get("status").asInt()).isEqualTo(404);
        assertThat(body.get("detail").asText()).contains(unknownId);
    }

    @Test
    void getByNonUuidIdentifierIsRejectedWithBadRequest() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/not-a-uuid"))
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------------
    // PATCH /api/v1/policies/flag
    // ---------------------------------------------------------------------

    @Test
    @Transactional
    void bulkFlagReportsUpdatedForExistingAndNotFoundForUnknownIds() throws Exception {
        List<String> unflagged = jdbcTemplate.queryForList(
                "SELECT CAST(id AS text) FROM policies WHERE flagged_for_review = FALSE "
                        + "ORDER BY policy_number LIMIT 2",
                String.class);
        assertThat(unflagged).hasSize(2);
        String first = unflagged.get(0);
        String second = unflagged.get(1);
        String unknown = UUID.randomUUID().toString();

        String requestBody = objectMapper.writeValueAsString(
                Map.of("policyIds", List.of(first, second, unknown)));

        JsonNode body = expectJson(patch(BASE_PATH + "/flag")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody), 200);

        JsonNode results = body.get("results");
        assertThat(results.size()).isEqualTo(3);
        assertThat(results.get(first).asText()).isEqualTo("updated");
        assertThat(results.get(second).asText()).isEqualTo("updated");
        assertThat(results.get(unknown).asText()).isEqualTo("not_found");

        // Same transaction as the request (test is @Transactional), so JDBC sees the flagged rows.
        assertThat(isFlagged(first)).isTrue();
        assertThat(isFlagged(second)).isTrue();
        assertThat(countPolicyRows(unknown)).isZero();
    }

    @Test
    void bulkFlagWithEmptyListIsRejectedWithValidationProblem() throws Exception {
        JsonNode body = expectProblem(patch(BASE_PATH + "/flag")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"policyIds\":[]}"), 400);

        assertThat(body.get("errors").get(0).get("field").asText()).isEqualTo("policyIds");
    }

    // ---------------------------------------------------------------------
    // GET /api/v1/policies/summary
    // ---------------------------------------------------------------------

    @Test
    void summaryReportsSeededCountsPerStatusAndExpiringSoon() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH + "/summary"), 200);

        JsonNode countByStatus = body.get("countByStatus");
        assertThat(countByStatus.size()).isEqualTo(4);
        assertThat(countByStatus.get("Active").asLong()).isEqualTo(94);
        assertThat(countByStatus.get("Expired").asLong()).isEqualTo(63);
        assertThat(countByStatus.get("Pending").asLong()).isEqualTo(32);
        assertThat(countByStatus.get("Cancelled").asLong()).isEqualTo(21);
        assertThat(body.get("totalPolicies").asLong()).isEqualTo(210);
        assertThat(body.get("expiringSoonCount").asLong()).isEqualTo(14);
        assertThat(body.has("totalPremiumByLineOfBusiness")).isTrue();
    }

    // ---------------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------------

    @Test
    void unknownSortPropertyIsRejectedWithBadRequestProblem() throws Exception {
        JsonNode body = expectProblem(get(BASE_PATH).param("sort", "doesNotExist,asc"), 400);

        assertThat(body.get("status").asInt()).isEqualTo(400);
    }

    @Test
    void regionFilterIsCaseInsensitive() throws Exception {
        long expected = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM policies WHERE region = ?", Long.class, "Japan");
        assertThat(expected).isPositive();

        JsonNode body = expectJson(get(BASE_PATH)
                .param("region", "japan")
                .param("size", "250"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(expected);
        for (JsonNode item : body.get("content")) {
            assertThat(item.get("region").asText()).isEqualTo("Japan");
        }
    }

    @Test
    void searchTreatsPercentAndUnderscoreAsLiteralCharacters() throws Exception {
        for (String term : List.of("%", "_")) {
            JsonNode body = expectJson(get(BASE_PATH).param("search", term), 200);

            assertThat(body.get("totalElements").asLong())
                    .as("search for literal '%s' must not act as a SQL wildcard", term)
                    .isZero();
        }
    }

    @Test
    void effectiveDateRangeBoundsAreInclusive() throws Exception {
        LocalDate tanakaEffective = jdbcTemplate.queryForObject(
                "SELECT effective_date FROM policies WHERE policy_number = ?",
                LocalDate.class, TANAKA_POLICY_NUMBER);
        long expected = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM policies WHERE effective_date = ?",
                Long.class, Date.valueOf(tanakaEffective));

        JsonNode body = expectJson(get(BASE_PATH)
                .param("effectiveDateFrom", tanakaEffective.toString())
                .param("effectiveDateTo", tanakaEffective.toString())
                .param("size", "250"), 200);

        assertThat(body.get("totalElements").asLong()).isEqualTo(expected);
        List<String> policyNumbers = new ArrayList<>();
        for (JsonNode item : body.get("content")) {
            assertThat(LocalDate.parse(item.get("effectiveDate").asText())).isEqualTo(tanakaEffective);
            policyNumbers.add(item.get("policyNumber").asText());
        }
        assertThat(policyNumbers).contains(TANAKA_POLICY_NUMBER);
    }

    @Test
    void effectiveDateFromAfterToReturnsEmptyPage() throws Exception {
        JsonNode body = expectJson(get(BASE_PATH)
                .param("effectiveDateFrom", "2099-01-01")
                .param("effectiveDateTo", "2000-01-01"), 200);

        assertThat(body.get("totalElements").asLong()).isZero();
        assertThat(body.get("content").size()).isZero();
    }

    @Test
    @Transactional
    void bulkFlagWithDuplicateIdsReturnsSingleResultAndIsIdempotent() throws Exception {
        String id = tanakaPolicyId();
        String requestBody = objectMapper.writeValueAsString(Map.of("policyIds", List.of(id, id)));

        for (int attempt = 1; attempt <= 2; attempt++) {
            JsonNode body = expectJson(patch(BASE_PATH + "/flag")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody), 200);

            assertThat(body.get("results").size()).as("attempt %d", attempt).isEqualTo(1);
            assertThat(body.get("results").get(id).asText()).as("attempt %d", attempt).isEqualTo("updated");
            assertThat(isFlagged(id)).as("attempt %d", attempt).isTrue();
        }
    }

    @Test
    @Transactional
    void bulkFlagRefreshesUpdatedAtBecauseBulkUpdateBypassesPreUpdate() throws Exception {
        String id = tanakaPolicyId();
        Timestamp before = updatedAt(id);

        expectJson(patch(BASE_PATH + "/flag")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("policyIds", List.of(id)))), 200);

        assertThat(updatedAt(id)).isAfter(before);
    }

    @Test
    void bulkFlagWithMalformedUuidIsRejectedWithBadRequestProblem() throws Exception {
        expectProblem(patch(BASE_PATH + "/flag")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"policyIds\":[\"not-a-uuid\"]}"), 400);
    }

    @Test
    void bulkFlagWithMissingPolicyIdsFieldIsRejectedWithFieldError() throws Exception {
        JsonNode body = expectProblem(patch(BASE_PATH + "/flag")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"), 400);

        assertThat(body.get("errors").get(0).get("field").asText()).isEqualTo("policyIds");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /** Performs the request, expects the given status, and returns the parsed JSON body. */
    private JsonNode expectJson(MockHttpServletRequestBuilder request, int expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    /** Performs the request, expects the given status and an application/problem+json body. */
    private JsonNode expectProblem(MockHttpServletRequestBuilder request, int expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String tanakaPolicyId() {
        return jdbcTemplate.queryForObject(
                "SELECT CAST(id AS text) FROM policies WHERE policy_number = ?",
                String.class, TANAKA_POLICY_NUMBER);
    }

    private long countEffectiveOnOrAfter(LocalDate from) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM policies WHERE effective_date >= ?",
                Long.class, Date.valueOf(from));
        return count;
    }

    private boolean isFlagged(String id) {
        Boolean flagged = jdbcTemplate.queryForObject(
                "SELECT flagged_for_review FROM policies WHERE id = CAST(? AS uuid)",
                Boolean.class, id);
        return Boolean.TRUE.equals(flagged);
    }

    private Timestamp updatedAt(String id) {
        return jdbcTemplate.queryForObject(
                "SELECT updated_at FROM policies WHERE id = CAST(? AS uuid)",
                Timestamp.class, id);
    }

    private long countPolicyRows(String id) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM policies WHERE id = CAST(? AS uuid)",
                Long.class, id);
        return count;
    }
}
