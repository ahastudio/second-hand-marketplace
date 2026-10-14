package com.marketplace;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;

@TestConfiguration(proxyBeanMethods = false)
@Import(TestcontainersConfiguration.class)
public class TestcontainersConfigurationAccess {
}
