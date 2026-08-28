# External screenshot service + grayscale S3 + client tint

Full-color screenshots for every theme/color would explode storage and bandwidth, and in-process capture made tab create/update too slow. Capture runs on a dedicated Hono screenshot server into light/dark grayscale JPEGs on S3; the client tints previews with a blend overlay. Extra infra and async capture complexity buy fast writes and theme-flexible previews.
