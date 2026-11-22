// .env dosyasını diğer modüllerden önce yükler (varsa).
try {
  process.loadEnvFile();
} catch {
  /* .env yoksa ortam değişkenleri kullanılır */
}
