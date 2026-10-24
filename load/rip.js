import http from "k6/http";
import { check, sleep } from "k6";

// Staging shape for the acceptance load. Do not point this at a database you cannot rebuild.
// Run: k6 run -e BASE_URL=http://127.0.0.1:3000 -e COOKIE='cdr_session=...' -e LOAD_TEST_TOKEN=... load/rip.js
export const options = {
  scenarios: {
    rips: {
      executor: "constant-arrival-rate",
      rate: 200,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const key = `k6_${__VU}_${__ITER}_${Date.now()}`;
  const response = http.post(
    `${__ENV.BASE_URL || "http://127.0.0.1:3000"}/api/rip`,
    JSON.stringify({ packSlug: __ENV.PACK_SLUG || "pack-25", idempotencyKey: key }),
    {
      headers: {
        "content-type": "application/json",
        cookie: __ENV.COOKIE || "",
        "x-load-test": __ENV.LOAD_TEST_TOKEN || "",
      },
    },
  );
  check(response, { "rip responded": (res) => res.status === 200 || res.status === 400 });
  sleep(0.01);
}
