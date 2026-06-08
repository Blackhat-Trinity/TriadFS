# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY . .
RUN mvn -pl api-server -am clean package -DskipTests

FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 triadfs \
    && mkdir -p /app/data/chunks \
    && chown -R triadfs:triadfs /app

WORKDIR /app
COPY --from=build /workspace/api-server/target/api-server-*.jar /app/app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8080

USER triadfs
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]