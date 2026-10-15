package com.marketplace;

import org.junit.jupiter.api.Test;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

class BackendApplicationMainTest {

	@Test
	void main_starts_the_application() {
		try (PostgreSQLContainer database = new PostgreSQLContainer(DockerImageName.parse("postgres:latest"))) {
			database.start();

			BackendApplication.main(new String[] {
				"--server.port=0",
				"--spring.datasource.url=" + database.getJdbcUrl(),
				"--spring.datasource.username=" + database.getUsername(),
				"--spring.datasource.password=" + database.getPassword(),
				"--app.jwt.secret=" + "x".repeat(40)
			});
		}
	}
}
