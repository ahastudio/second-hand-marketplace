FROM eclipse-temurin:25-jdk-noble AS build

ENV SDKMAN_DIR=/root/.sdkman
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip zip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -s "https://get.sdkman.io" | bash \
    && source "$SDKMAN_DIR/bin/sdkman-init.sh" \
    && sdk install java 25.0.4-tem

ENV JAVA_HOME=/root/.sdkman/candidates/java/current
ENV PATH="$JAVA_HOME/bin:$PATH"

WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:25-jre-noble AS runtime

WORKDIR /app
COPY --from=build /app/build/libs/backend-0.0.1-SNAPSHOT.jar ./app.jar
RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app app \
    && chown -R app:app /app
USER app:app

EXPOSE 25801
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
