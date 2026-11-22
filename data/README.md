# Ücretsiz veri kaynakları

Bu klasördeki dosyalar `node scripts/build-data.mjs` ile üretilir ve Lisan'ın API'siz (ücretsiz) modunu besler.

| Dosya | Kaynak | Lisans |
|---|---|---|
| `en-tr.tsv.gz` | [Tatoeba](https://tatoeba.org) İngilizce–Türkçe cümle çiftleri ([manythings.org](https://www.manythings.org/anki/) derlemesi, [ibodev1/sentence-pairs-parser](https://github.com/ibodev1/sentence-pairs-parser) aynası). Sütunlar: Tatoeba cümle no, zorluk (en nadir kelimenin sıklık sırası), İngilizce, Türkçe | CC-BY 2.0 FR — © Tatoeba katkıcıları |
| `freq-*.txt.gz` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018) — en sık kelimeler | CC-BY-SA 4.0 |
| `gloss-en-tr.json.gz` | Yukarıdaki cümle çiftlerinden istatistiksel hizalama (Dice katsayısı) ile çıkarılmış yaklaşık kelime anlamları: `{ kelime: [türkçe, güven %] }` | CC-BY 2.0 FR (türetilmiş) |

Çalışma anında ayrıca [Wikipedia](https://www.wikipedia.org) (CC BY-SA 4.0) özet ve analiz için, [Project Gutenberg](https://www.gutenberg.org) telifsiz kitaplar için kullanılır.
