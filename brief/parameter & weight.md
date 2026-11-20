# Parameter & Weight Random Forest - BanyuWening PRD v2.2

> Dokumen ini berisi parameter dan bobot yang benar-benar digunakan pada eksperimen Kaggle tanggal 20 November 2026. Hanya 15 model dengan status COMPLETED yang dicantumkan.

## 1. Jenis model dan software

- Algoritma: `sklearn.ensemble.RandomForestClassifier` (klasifikasi).
- scikit-learn: `1.7.2`.
- Setiap seri data dilatih terpisah untuk horizon 1 jam, 2 jam, dan 3 jam; 15 model tersimpan.
- Model file: `random_forest_prd_update_experiment/models/<series_id>/rf_<horizon>.joblib`.

## 2. Parameter baseline bersama

| Parameter | Nilai aktual | Makna |
|---|---:|---|
| `n_estimators` | 100 | Dipilih dari tuning 100/200/300/500/800; jumlah terkecil dalam 0,005 macro-F1 dari puncak CV |
| `criterion` | `gini` | Kriteria pemisahan node |
| `max_depth` | 18 | Batas kedalaman pohon |
| `min_samples_split` | 2 | Minimum sampel untuk memecah node |
| `min_samples_leaf` | 2 | Minimum sampel pada daun |
| `max_features` | `sqrt` | Fitur kandidat per split |
| `bootstrap` | `true` | Sampel bootstrap per pohon |
| `class_weight` | `balanced` | Pembobot kelas berdasarkan frekuensi train |
| `random_state` | 42 | Reproduksibilitas |
| `n_jobs` | -1 | Gunakan seluruh core tersedia |
| `oob_score` | `false` | OOB score tidak dipakai |
| `max_samples` | `null` | Bootstrap menggunakan seluruh ukuran train |

Parameter lain tetap pada default scikit-learn 1.7.2: `min_weight_fraction_leaf=0`, `max_leaf_nodes=null`, `min_impurity_decrease=0`, `ccp_alpha=0`, `warm_start=false`, `verbose=0`, `n_classes` sesuai label, `n_features` sesuai pipeline. Imputasi median berada di `Pipeline` dan di-fit hanya pada training fold.

## 3. Pengertian weight pada Random Forest

Random Forest tidak memiliki satu vektor koefisien `coef_` seperti regresi linear. Dalam konfigurasi ini tiap pohon menyumbang suara probabilitas dengan bobot yang sama (1/100 sebelum agregasi rata-rata). Ada dua nilai berbobot yang dilaporkan di bawah:

1. **Class weight**: faktor penyeimbang untuk kelas pada data training. Karena rasio kelas terbesar/terkecil lebih dari 1,5 pada seluruh model yang selesai, nilai aktual `class_weight="balanced"`. Faktor per kelas mengikuti `n_train / (n_classes * jumlah_kelas)`.
2. **Feature importance**: bobot relatif impurity-based (`feature_importances_`) untuk fitur hasil preprocessing; jumlahnya kira-kira 1 pada tiap model. Ini bukan koefisien arah atau bukti sebab-akibat. Permutation importance tersimpan sebagai analisis tambahan.

## 3A. Definisi status dan batas penggunaan label

Eksperimen memakai status masa depan sebagai target proxy dengan kebijakan PRD v2.3 berikut.

| Parameter | AMAN | WASPADA | BAHAYA | Dipakai membentuk label benchmark? |
|---|---|---|---|---|
| Suhu | 25-30 C | 22-<25 atau >30-33 C | <22 atau >33 C | Ya |
| pH | 6.5-8.5 | 6.0-<6.5 atau >8.5-8.8 | <6.0 atau >8.8 | Ya |
| TDS | Rentang lokal tervalidasi | Menyimpang dari baseline lokal | Penyimpangan ekstrem lokal | Belum |
| Turbiditas | Rentang lokal tervalidasi | Meningkat dari baseline lokal | Peningkatan ekstrem lokal | Belum |
| Ketinggian air | Batas operasional kolam | Mendekati batas min./maks. | Di luar batas operasional | Belum; tidak tersedia pada dataset publik |

Rentang suhu dan pH mengikuti SNI 8228.4:2015 sebagaimana ditetapkan pada PRD. TDS, turbiditas, dan ketinggian air belum diberi nilai numerik universal dalam model karena harus ditetapkan dari pengukuran baseline per `pond_id` dan validasi lapangan. Pada data publik, TDS/turbiditas yang tersedia tetap dapat menjadi **fitur prediktor**; keduanya tidak diizinkan menentukan target kelas sampai konfigurasi baseline lokal tervalidasi. Oleh karena itu semua metrik di dokumen ini adalah metrik proxy pH/suhu, bukan validasi penuh lima sensor.


## 3A. Alasan jumlah pohon final: 100

Jumlah pohon tidak dipilih dengan anggapan bahwa voting akan menjadi sempurna jika pohonnya diperbanyak. Saya membandingkan 100, 200, 300, 500, dan 800 pohon menggunakan 3-fold `TimeSeriesSplit` pada bagian training kronologis dari 15 eksperimen yang layak (45 fold total). Setiap fold memakai urutan waktu, gap sesuai horizon, preprocessing median hanya pada train fold, `max_depth=18`, `min_samples_leaf=2`, seed 42, dan bobot kelas sesuai data fold. Aturan pemilihan yang ditetapkan sebelum membaca hasil adalah jumlah pohon terkecil dengan mean macro-F1 maksimal selisih 0,005 dari kandidat terbaik.

| Pohon | Mean macro-F1 validasi | SD antar-fold | Mean macro-F1 train | Mean gap train-validasi | Waktu membangun pohon tambahan rata-rata (detik/fold) |
|---:|---:|---:|---:|---:|---:|
| 100 | 0.554153 | 0.172372 | 0.902681 | 0.348528 | 0.793 |
| 200 | 0.551867 | 0.174977 | 0.902624 | 0.350757 | 0.791 |
| 300 | 0.554355 | 0.174386 | 0.902803 | 0.348448 | 0.800 |
| 500 | 0.553540 | 0.174221 | 0.902884 | 0.349344 | 1.531 |
| 800 | 0.554714 | 0.175089 | 0.902950 | 0.348236 | 2.259 |

Skor CV tertinggi adalah 0.554714 pada 800 pohon. Namun 100 pohon hanya 0.000561 di bawahnya, masih di dalam toleransi 0.005, sehingga 100 adalah ukuran terkecil yang lolos aturan. Semua kandidat juga berada dalam toleransi tersebut. Pada perbandingan holdout berpasangan 100 vs 300, mean macro-F1 berubah dari 0.436046 menjadi 0.435485 (delta -0.000561); 3 dari 15 model membaik, 4 tetap, dan 8 menurun. Waktu fit rata-rata model 300 pohon sekitar 2.71 kali model 100 pohon. Jadi eksperimen ini tidak mendukung 300 pohon untuk model final.

Peningkatan voting stabil di sekitar plateau pada kumpulan eksperimen ini, tetapi **gap train-validasi rata-rata sekitar 0.349 tetap besar** untuk semua ukuran. Penambahan pohon tidak mengatasi overfitting/pergeseran distribusi yang tampak di data. Karena itu, 100 pohon adalah pilihan paling kecil dan ringan yang skornya sudah setara dalam toleransi yang ditetapkan; ini bukan angka maksimum matematis dan bukan jaminan akurasi bagus pada dataset/kolam baru. Untuk generalisasi, perlu label lapangan independen, pemisahan berdasarkan waktu dan kolam, serta evaluasi eksternal. Hasil detail tersimpan di `random_forest_prd_update_experiment/results/comparison/forest_size_cv_summary.csv`, `forest_size_tuning.json`, `forest_size_cv_curve.png`, dan `holdout_100_vs_300.csv`.

## 4. Parameter dan class weight per model

| Model | Horizon | Train | Test | Class weight aktual | Berkas model |
|---|---:|---:|---:|---|---|
| `catfish_pond2` | 1h | 13127 | 1194 | `balanced`: 0.0=1.5068 (n=2904), 1.0=0.4560 (n=9596), 2.0=6.9787 (n=627) | `models\catfish_pond2\rf_1h.joblib` |
| `catfish_pond2` | 2h | 12931 | 1144 | `balanced`: 0.0=1.4863 (n=2900), 1.0=0.4567 (n=9437), 2.0=7.2565 (n=594) | `models\catfish_pond2\rf_2h.joblib` |
| `catfish_pond2` | 3h | 12729 | 1109 | `balanced`: 0.0=1.4820 (n=2863), 1.0=0.4564 (n=9296), 2.0=7.4439 (n=570) | `models\catfish_pond2\rf_3h.joblib` |
| `catfish_pond6` | 1h | 10434 | 340 | `balanced`: 0.0=3.5930 (n=968), 1.0=0.5089 (n=6834), 2.0=1.3214 (n=2632) | `models\catfish_pond6\rf_1h.joblib` |
| `catfish_pond6` | 2h | 10156 | 321 | `balanced`: 0.0=3.5673 (n=949), 1.0=0.5101 (n=6637), 2.0=1.3173 (n=2570) | `models\catfish_pond6\rf_2h.joblib` |
| `catfish_pond6` | 3h | 9845 | 299 | `balanced`: 0.0=3.5865 (n=915), 1.0=0.5098 (n=6437), 2.0=1.3164 (n=2493) | `models\catfish_pond6\rf_3h.joblib` |
| `catfish_pond7` | 1h | 16835 | 3983 | `balanced`: 0.0=0.5639 (n=9952), 1.0=0.8934 (n=6281), 2.0=9.3217 (n=602) | `models\catfish_pond7\rf_1h.joblib` |
| `catfish_pond7` | 2h | 16594 | 3878 | `balanced`: 0.0=0.5665 (n=9764), 1.0=0.8846 (n=6253), 2.0=9.5864 (n=577) | `models\catfish_pond7\rf_2h.joblib` |
| `catfish_pond7` | 3h | 16396 | 3804 | `balanced`: 0.0=0.5692 (n=9601), 1.0=0.8761 (n=6238), 2.0=9.8121 (n=557) | `models\catfish_pond7\rf_3h.joblib` |
| `catfish_pond9` | 1h | 9248 | 5995 | `balanced`: 0.0=3.8630 (n=798), 1.0=0.4425 (n=6966), 2.0=2.0773 (n=1484) | `models\catfish_pond9\rf_1h.joblib` |
| `catfish_pond9` | 2h | 9013 | 5937 | `balanced`: 0.0=3.8766 (n=775), 1.0=0.4397 (n=6832), 2.0=2.1368 (n=1406) | `models\catfish_pond9\rf_2h.joblib` |
| `catfish_pond9` | 3h | 8856 | 5891 | `balanced`: 0.0=3.7992 (n=777), 1.0=0.4393 (n=6720), 2.0=2.1722 (n=1359) | `models\catfish_pond9\rf_3h.joblib` |
| `bobsis_raw` | 1h | 9064 | 982 | `balanced`: 0.0=3.3056 (n=914), 1.0=0.6351 (n=4757), 2.0=0.8905 (n=3393) | `models\bobsis_raw\rf_1h.joblib` |
| `bobsis_raw` | 2h | 8723 | 928 | `balanced`: 0.0=3.4533 (n=842), 1.0=0.6354 (n=4576), 2.0=0.8798 (n=3305) | `models\bobsis_raw\rf_2h.joblib` |
| `bobsis_raw` | 3h | 8385 | 873 | `balanced`: 0.0=3.5470 (n=788), 1.0=0.6386 (n=4377), 2.0=0.8680 (n=3220) | `models\bobsis_raw\rf_3h.joblib` |

## 5. Bobot feature importance aktual per model

Nilai di bawah disalin dari `feature_importance.csv` yang dihasilkan setelah setiap model dilatih. Angka lebih tinggi berarti fitur tersebut lebih sering/lebih kuat menurunkan impurity dalam pohon pada model itu. Perbandingan fitur antarseri tidak langsung setara karena sensor yang tersedia berbeda.

### catfish_pond2 - 1h

Train/test: 13127/1194; accuracy=0.9690; macro-F1=0.3289; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.23537213 |
| `ph_mean_1h` | 0.17647476 |
| `temperature_c_mean_1h` | 0.16509991 |
| `temperature_c_now` | 0.15476337 |
| `ph_std_1h` | 0.06876796 |
| `hour_sin` | 0.02767367 |
| `day_sin` | 0.02229712 |
| `temperature_c_delta_3h` | 0.02058604 |
| `ph_delta_3h` | 0.01543449 |
| `temperature_c_std_1h` | 0.01523569 |
| `ph_delta_1h` | 0.01425862 |
| `hour_cos` | 0.01237524 |
| `temperature_c_delta_1h` | 0.01161336 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00829485 |
| `turbidity_ntu_now` | 0.00771731 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00701676 |
| `missingindicator_turbidity_ntu_now` | 0.00641628 |
| `turbidity_ntu_mean_1h` | 0.00596154 |
| `day_cos` | 0.00587597 |
| `turbidity_ntu_missing` | 0.00330883 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00249128 |
| `turbidity_ntu_std_1h` | 0.00209792 |
| `missingindicator_ph_mean_1h` | 0.00180504 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00170583 |
| `missingindicator_ph_delta_3h` | 0.00113411 |
| `missingindicator_ph_std_1h` | 0.00113313 |
| `turbidity_ntu_delta_3h` | 0.00095374 |
| `turbidity_ntu_delta_1h` | 0.00089929 |
| `missingindicator_temperature_c_delta_3h` | 0.00085121 |
| `missingindicator_ph_delta_1h` | 0.00075803 |
| `missingindicator_temperature_c_delta_1h` | 0.00064983 |
| `missingindicator_temperature_c_std_1h` | 0.00063137 |
| `missingindicator_temperature_c_mean_1h` | 0.00034533 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond2_1h/permutation_importance.csv`.

### catfish_pond2 - 2h

Train/test: 12931/1144; accuracy=0.9642; macro-F1=0.3275; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.21474323 |
| `ph_mean_1h` | 0.21149903 |
| `temperature_c_now` | 0.15758939 |
| `temperature_c_mean_1h` | 0.12154359 |
| `ph_std_1h` | 0.07765651 |
| `temperature_c_delta_3h` | 0.02540142 |
| `temperature_c_std_1h` | 0.02397643 |
| `hour_sin` | 0.02386939 |
| `temperature_c_delta_1h` | 0.02183614 |
| `hour_cos` | 0.01991457 |
| `day_sin` | 0.01700211 |
| `ph_delta_3h` | 0.01298988 |
| `ph_delta_1h` | 0.00914293 |
| `turbidity_ntu_mean_1h` | 0.00827739 |
| `turbidity_ntu_now` | 0.00751576 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00718550 |
| `day_cos` | 0.00708907 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00697962 |
| `missingindicator_turbidity_ntu_now` | 0.00523682 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00446517 |
| `turbidity_ntu_std_1h` | 0.00301939 |
| `missingindicator_temperature_c_delta_3h` | 0.00196842 |
| `turbidity_ntu_missing` | 0.00184336 |
| `missingindicator_ph_delta_3h` | 0.00167791 |
| `missingindicator_ph_mean_1h` | 0.00112380 |
| `missingindicator_ph_delta_1h` | 0.00108300 |
| `missingindicator_temperature_c_delta_1h` | 0.00098051 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00095659 |
| `missingindicator_ph_std_1h` | 0.00095358 |
| `turbidity_ntu_delta_3h` | 0.00093812 |
| `turbidity_ntu_delta_1h` | 0.00084643 |
| `missingindicator_temperature_c_std_1h` | 0.00035159 |
| `missingindicator_temperature_c_mean_1h` | 0.00034332 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond2_2h/permutation_importance.csv`.

### catfish_pond2 - 3h

Train/test: 12729/1109; accuracy=0.9594; macro-F1=0.3264; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.22042883 |
| `ph_mean_1h` | 0.19177917 |
| `temperature_c_now` | 0.13885624 |
| `temperature_c_mean_1h` | 0.10577278 |
| `ph_std_1h` | 0.06688829 |
| `temperature_c_std_1h` | 0.03670743 |
| `temperature_c_delta_3h` | 0.03411646 |
| `hour_cos` | 0.02945284 |
| `day_sin` | 0.02850382 |
| `temperature_c_delta_1h` | 0.02422879 |
| `hour_sin` | 0.02136668 |
| `ph_delta_3h` | 0.01950991 |
| `ph_delta_1h` | 0.00959292 |
| `turbidity_ntu_now` | 0.00834009 |
| `day_cos` | 0.00798190 |
| `turbidity_ntu_mean_1h` | 0.00779277 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00778278 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00642434 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00630097 |
| `turbidity_ntu_std_1h` | 0.00428919 |
| `missingindicator_turbidity_ntu_now` | 0.00371341 |
| `missingindicator_ph_delta_3h` | 0.00312228 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00248992 |
| `missingindicator_temperature_c_delta_3h` | 0.00201121 |
| `missingindicator_ph_std_1h` | 0.00201062 |
| `missingindicator_ph_mean_1h` | 0.00188765 |
| `turbidity_ntu_missing` | 0.00185218 |
| `turbidity_ntu_delta_3h` | 0.00179027 |
| `missingindicator_temperature_c_delta_1h` | 0.00120591 |
| `turbidity_ntu_delta_1h` | 0.00117410 |
| `missingindicator_ph_delta_1h` | 0.00104814 |
| `missingindicator_temperature_c_std_1h` | 0.00097768 |
| `missingindicator_temperature_c_mean_1h` | 0.00060042 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond2_3h/permutation_importance.csv`.

### catfish_pond6 - 1h

Train/test: 10434/340; accuracy=1.0000; macro-F1=0.6667; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.19729887 |
| `ph_mean_1h` | 0.18614947 |
| `temperature_c_now` | 0.17726248 |
| `temperature_c_mean_1h` | 0.15160005 |
| `ph_std_1h` | 0.07765264 |
| `day_sin` | 0.02370618 |
| `ph_delta_1h` | 0.02131492 |
| `ph_delta_3h` | 0.02062644 |
| `temperature_c_delta_3h` | 0.01696284 |
| `missingindicator_turbidity_ntu_std_1h` | 0.01659845 |
| `hour_sin` | 0.01476163 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.01456391 |
| `turbidity_ntu_std_1h` | 0.01136518 |
| `hour_cos` | 0.00965224 |
| `missingindicator_turbidity_ntu_now` | 0.00945175 |
| `temperature_c_std_1h` | 0.00899552 |
| `temperature_c_delta_1h` | 0.00629127 |
| `turbidity_ntu_mean_1h` | 0.00627810 |
| `day_cos` | 0.00519027 |
| `turbidity_ntu_missing` | 0.00326869 |
| `missingindicator_ph_delta_1h` | 0.00271176 |
| `missingindicator_ph_delta_3h` | 0.00267906 |
| `turbidity_ntu_now` | 0.00259584 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00199656 |
| `turbidity_ntu_delta_3h` | 0.00189743 |
| `missingindicator_temperature_c_delta_3h` | 0.00185803 |
| `missingindicator_temperature_c_delta_1h` | 0.00161468 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00141801 |
| `turbidity_ntu_delta_1h` | 0.00118151 |
| `missingindicator_ph_std_1h` | 0.00095403 |
| `missingindicator_temperature_c_mean_1h` | 0.00074855 |
| `missingindicator_ph_mean_1h` | 0.00072731 |
| `missingindicator_temperature_c_std_1h` | 0.00062635 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond6_1h/permutation_importance.csv`.

### catfish_pond6 - 2h

Train/test: 10156/321; accuracy=1.0000; macro-F1=0.6667; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_mean_1h` | 0.19279478 |
| `ph_now` | 0.19254825 |
| `temperature_c_now` | 0.16215120 |
| `temperature_c_mean_1h` | 0.15647551 |
| `ph_std_1h` | 0.06057564 |
| `day_sin` | 0.02468952 |
| `temperature_c_delta_3h` | 0.02071464 |
| `missingindicator_turbidity_ntu_std_1h` | 0.01901423 |
| `ph_delta_1h` | 0.01830458 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.01821371 |
| `ph_delta_3h` | 0.01661943 |
| `hour_sin` | 0.01389938 |
| `temperature_c_std_1h` | 0.01239686 |
| `turbidity_ntu_std_1h` | 0.01209625 |
| `missingindicator_turbidity_ntu_now` | 0.01174650 |
| `hour_cos` | 0.01049340 |
| `temperature_c_delta_1h` | 0.00969953 |
| `turbidity_ntu_mean_1h` | 0.00773539 |
| `turbidity_ntu_missing` | 0.00729820 |
| `day_cos` | 0.00716559 |
| `turbidity_ntu_now` | 0.00416062 |
| `turbidity_ntu_delta_3h` | 0.00279889 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00277132 |
| `missingindicator_temperature_c_delta_1h` | 0.00263698 |
| `missingindicator_ph_delta_1h` | 0.00221514 |
| `missingindicator_ph_delta_3h` | 0.00201195 |
| `missingindicator_temperature_c_delta_3h` | 0.00187474 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00158816 |
| `turbidity_ntu_delta_1h` | 0.00148742 |
| `missingindicator_ph_std_1h` | 0.00113077 |
| `missingindicator_temperature_c_std_1h` | 0.00108984 |
| `missingindicator_ph_mean_1h` | 0.00087569 |
| `missingindicator_temperature_c_mean_1h` | 0.00072588 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond6_2h/permutation_importance.csv`.

### catfish_pond6 - 3h

Train/test: 9845/299; accuracy=1.0000; macro-F1=0.6667; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_mean_1h` | 0.19662695 |
| `ph_now` | 0.17726571 |
| `temperature_c_now` | 0.15816964 |
| `temperature_c_mean_1h` | 0.12690886 |
| `ph_std_1h` | 0.07854649 |
| `day_sin` | 0.02945371 |
| `missingindicator_turbidity_ntu_std_1h` | 0.02219311 |
| `temperature_c_delta_3h` | 0.01835003 |
| `turbidity_ntu_std_1h` | 0.01721237 |
| `ph_delta_3h` | 0.01625927 |
| `ph_delta_1h` | 0.01609824 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.01591732 |
| `turbidity_ntu_mean_1h` | 0.01395816 |
| `missingindicator_turbidity_ntu_now` | 0.01370649 |
| `temperature_c_std_1h` | 0.01313311 |
| `hour_cos` | 0.01295354 |
| `hour_sin` | 0.01246490 |
| `temperature_c_delta_1h` | 0.01213616 |
| `turbidity_ntu_missing` | 0.01019959 |
| `day_cos` | 0.00953903 |
| `turbidity_ntu_now` | 0.00585899 |
| `turbidity_ntu_delta_1h` | 0.00296517 |
| `turbidity_ntu_delta_3h` | 0.00285671 |
| `missingindicator_temperature_c_delta_1h` | 0.00266940 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00260759 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00258696 |
| `missingindicator_ph_delta_1h` | 0.00249613 |
| `missingindicator_temperature_c_delta_3h` | 0.00153955 |
| `missingindicator_ph_delta_3h` | 0.00141141 |
| `missingindicator_temperature_c_mean_1h` | 0.00112069 |
| `missingindicator_temperature_c_std_1h` | 0.00111085 |
| `missingindicator_ph_std_1h` | 0.00084415 |
| `missingindicator_ph_mean_1h` | 0.00083976 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond6_3h/permutation_importance.csv`.

### catfish_pond7 - 1h

Train/test: 16835/3983; accuracy=0.9676; macro-F1=0.3542; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `temperature_c_mean_1h` | 0.20610991 |
| `temperature_c_now` | 0.18559854 |
| `ph_now` | 0.14768834 |
| `turbidity_ntu_mean_1h` | 0.10592142 |
| `ph_mean_1h` | 0.09907423 |
| `turbidity_ntu_now` | 0.07599590 |
| `ph_std_1h` | 0.04454592 |
| `hour_sin` | 0.02956954 |
| `temperature_c_delta_3h` | 0.02013679 |
| `ph_delta_3h` | 0.01919139 |
| `hour_cos` | 0.01359261 |
| `ph_delta_1h` | 0.01275757 |
| `temperature_c_delta_1h` | 0.01006998 |
| `temperature_c_std_1h` | 0.00660242 |
| `turbidity_ntu_std_1h` | 0.00550589 |
| `day_cos` | 0.00515889 |
| `day_sin` | 0.00467176 |
| `turbidity_ntu_delta_3h` | 0.00178566 |
| `turbidity_ntu_delta_1h` | 0.00178420 |
| `missingindicator_ph_delta_3h` | 0.00101133 |
| `missingindicator_temperature_c_delta_3h` | 0.00073565 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00036558 |
| `missingindicator_temperature_c_mean_1h` | 0.00030447 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00030376 |
| `missingindicator_temperature_c_std_1h` | 0.00028515 |
| `missingindicator_ph_delta_1h` | 0.00025882 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00025687 |
| `missingindicator_ph_mean_1h` | 0.00020651 |
| `missingindicator_ph_std_1h` | 0.00018276 |
| `missingindicator_temperature_c_delta_1h` | 0.00017697 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00015116 |
| `turbidity_ntu_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond7_1h/permutation_importance.csv`.

### catfish_pond7 - 2h

Train/test: 16594/3878; accuracy=0.9706; macro-F1=0.3297; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `temperature_c_now` | 0.17665544 |
| `temperature_c_mean_1h` | 0.17522400 |
| `ph_now` | 0.15348441 |
| `ph_mean_1h` | 0.11372916 |
| `turbidity_ntu_mean_1h` | 0.09759771 |
| `turbidity_ntu_now` | 0.05660593 |
| `ph_std_1h` | 0.04520046 |
| `temperature_c_delta_3h` | 0.03291108 |
| `hour_sin` | 0.03072322 |
| `hour_cos` | 0.02676941 |
| `ph_delta_3h` | 0.02091782 |
| `temperature_c_delta_1h` | 0.01741040 |
| `ph_delta_1h` | 0.01551359 |
| `temperature_c_std_1h` | 0.00822428 |
| `turbidity_ntu_std_1h` | 0.00661588 |
| `day_cos` | 0.00658255 |
| `day_sin` | 0.00572811 |
| `turbidity_ntu_delta_3h` | 0.00227783 |
| `turbidity_ntu_delta_1h` | 0.00164449 |
| `missingindicator_temperature_c_delta_3h` | 0.00137344 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00120364 |
| `missingindicator_ph_delta_3h` | 0.00107548 |
| `missingindicator_ph_std_1h` | 0.00042660 |
| `missingindicator_ph_delta_1h` | 0.00039733 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00038669 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00027746 |
| `missingindicator_temperature_c_delta_1h` | 0.00026943 |
| `missingindicator_ph_mean_1h` | 0.00026418 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00023911 |
| `missingindicator_temperature_c_mean_1h` | 0.00018854 |
| `missingindicator_temperature_c_std_1h` | 0.00008233 |
| `turbidity_ntu_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond7_2h/permutation_importance.csv`.

### catfish_pond7 - 3h

Train/test: 16396/3804; accuracy=0.9682; macro-F1=0.3293; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.15681412 |
| `temperature_c_mean_1h` | 0.15623847 |
| `temperature_c_now` | 0.15128551 |
| `ph_mean_1h` | 0.11937656 |
| `turbidity_ntu_mean_1h` | 0.09542986 |
| `turbidity_ntu_now` | 0.07377554 |
| `hour_cos` | 0.04546575 |
| `temperature_c_delta_3h` | 0.03858182 |
| `ph_std_1h` | 0.03836096 |
| `hour_sin` | 0.02544914 |
| `temperature_c_delta_1h` | 0.02075300 |
| `ph_delta_3h` | 0.01946672 |
| `ph_delta_1h` | 0.01374801 |
| `temperature_c_std_1h` | 0.01052478 |
| `day_sin` | 0.00800982 |
| `day_cos` | 0.00772441 |
| `turbidity_ntu_std_1h` | 0.00749515 |
| `turbidity_ntu_delta_3h` | 0.00300716 |
| `turbidity_ntu_delta_1h` | 0.00234871 |
| `missingindicator_ph_delta_3h` | 0.00174199 |
| `missingindicator_temperature_c_delta_3h` | 0.00070634 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.00068859 |
| `missingindicator_ph_mean_1h` | 0.00049382 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.00045266 |
| `missingindicator_ph_delta_1h` | 0.00042900 |
| `missingindicator_ph_std_1h` | 0.00038046 |
| `missingindicator_temperature_c_delta_1h` | 0.00029887 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.00028506 |
| `missingindicator_temperature_c_mean_1h` | 0.00027217 |
| `missingindicator_temperature_c_std_1h` | 0.00020514 |
| `missingindicator_turbidity_ntu_std_1h` | 0.00019042 |
| `turbidity_ntu_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond7_3h/permutation_importance.csv`.

### catfish_pond9 - 1h

Train/test: 9248/5995; accuracy=0.8172; macro-F1=0.3092; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `temperature_c_now` | 0.15713861 |
| `temperature_c_mean_1h` | 0.13810860 |
| `ph_now` | 0.13620099 |
| `ph_mean_1h` | 0.12306483 |
| `missingindicator_turbidity_ntu_std_1h` | 0.06236148 |
| `missingindicator_turbidity_ntu_now` | 0.06174740 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.04768374 |
| `turbidity_ntu_missing` | 0.04355759 |
| `hour_sin` | 0.04068997 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.02418074 |
| `temperature_c_delta_3h` | 0.02373342 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.02253482 |
| `temperature_c_std_1h` | 0.01847483 |
| `turbidity_ntu_mean_1h` | 0.01622478 |
| `temperature_c_delta_1h` | 0.01227416 |
| `turbidity_ntu_std_1h` | 0.01057157 |
| `ph_std_1h` | 0.01046017 |
| `hour_cos` | 0.00964970 |
| `turbidity_ntu_now` | 0.00804419 |
| `ph_delta_3h` | 0.00673805 |
| `day_sin` | 0.00670709 |
| `day_cos` | 0.00577645 |
| `turbidity_ntu_delta_3h` | 0.00331829 |
| `turbidity_ntu_delta_1h` | 0.00315863 |
| `ph_delta_1h` | 0.00269801 |
| `missingindicator_ph_mean_1h` | 0.00079268 |
| `missingindicator_temperature_c_mean_1h` | 0.00074452 |
| `missingindicator_ph_delta_1h` | 0.00066521 |
| `missingindicator_ph_std_1h` | 0.00062835 |
| `missingindicator_ph_delta_3h` | 0.00062461 |
| `missingindicator_temperature_c_std_1h` | 0.00059119 |
| `missingindicator_temperature_c_delta_1h` | 0.00057252 |
| `missingindicator_temperature_c_delta_3h` | 0.00028280 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond9_1h/permutation_importance.csv`.

### catfish_pond9 - 2h

Train/test: 9013/5937; accuracy=0.7468; macro-F1=0.2919; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.14039410 |
| `temperature_c_now` | 0.13215700 |
| `ph_mean_1h` | 0.12559723 |
| `temperature_c_mean_1h` | 0.10909196 |
| `missingindicator_turbidity_ntu_std_1h` | 0.05679775 |
| `missingindicator_turbidity_ntu_now` | 0.05579233 |
| `turbidity_ntu_missing` | 0.05263003 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.04947941 |
| `hour_sin` | 0.03573297 |
| `temperature_c_delta_3h` | 0.02889143 |
| `temperature_c_std_1h` | 0.02835051 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.02657696 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.02258651 |
| `temperature_c_delta_1h` | 0.02037014 |
| `hour_cos` | 0.01890584 |
| `turbidity_ntu_std_1h` | 0.01797775 |
| `turbidity_ntu_mean_1h` | 0.01754844 |
| `ph_std_1h` | 0.01136193 |
| `day_sin` | 0.01001252 |
| `turbidity_ntu_now` | 0.00876654 |
| `ph_delta_3h` | 0.00781497 |
| `day_cos` | 0.00659724 |
| `turbidity_ntu_delta_3h` | 0.00561245 |
| `turbidity_ntu_delta_1h` | 0.00320078 |
| `ph_delta_1h` | 0.00253546 |
| `missingindicator_ph_delta_3h` | 0.00120276 |
| `missingindicator_temperature_c_delta_3h` | 0.00096342 |
| `missingindicator_ph_delta_1h` | 0.00065404 |
| `missingindicator_ph_std_1h` | 0.00058461 |
| `missingindicator_temperature_c_delta_1h` | 0.00049190 |
| `missingindicator_temperature_c_mean_1h` | 0.00047211 |
| `missingindicator_temperature_c_std_1h` | 0.00044112 |
| `missingindicator_ph_mean_1h` | 0.00040781 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond9_2h/permutation_importance.csv`.

### catfish_pond9 - 3h

Train/test: 8856/5891; accuracy=0.7819; macro-F1=0.2995; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_now` | 0.14035088 |
| `ph_mean_1h` | 0.13647211 |
| `temperature_c_now` | 0.09959407 |
| `temperature_c_mean_1h` | 0.08675577 |
| `missingindicator_turbidity_ntu_std_1h` | 0.06135821 |
| `missingindicator_turbidity_ntu_mean_1h` | 0.05817646 |
| `missingindicator_turbidity_ntu_now` | 0.05525787 |
| `turbidity_ntu_missing` | 0.04517645 |
| `temperature_c_delta_3h` | 0.03983207 |
| `temperature_c_std_1h` | 0.03747248 |
| `temperature_c_delta_1h` | 0.02886725 |
| `hour_cos` | 0.02512200 |
| `missingindicator_turbidity_ntu_delta_3h` | 0.02510620 |
| `hour_sin` | 0.02474842 |
| `missingindicator_turbidity_ntu_delta_1h` | 0.02199647 |
| `turbidity_ntu_mean_1h` | 0.02145586 |
| `turbidity_ntu_now` | 0.01410511 |
| `turbidity_ntu_std_1h` | 0.01298893 |
| `day_sin` | 0.01252334 |
| `ph_std_1h` | 0.01138585 |
| `turbidity_ntu_delta_3h` | 0.00832252 |
| `day_cos` | 0.00820066 |
| `ph_delta_3h` | 0.00805921 |
| `turbidity_ntu_delta_1h` | 0.00383243 |
| `ph_delta_1h` | 0.00331234 |
| `missingindicator_ph_delta_3h` | 0.00248998 |
| `missingindicator_temperature_c_delta_3h` | 0.00181275 |
| `missingindicator_ph_delta_1h` | 0.00151746 |
| `missingindicator_ph_std_1h` | 0.00091428 |
| `missingindicator_temperature_c_std_1h` | 0.00091244 |
| `missingindicator_temperature_c_delta_1h` | 0.00079820 |
| `missingindicator_ph_mean_1h` | 0.00062100 |
| `missingindicator_temperature_c_mean_1h` | 0.00046093 |
| `temperature_c_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/catfish_pond9_3h/permutation_importance.csv`.

### bobsis_raw - 1h

Train/test: 9064/982; accuracy=0.8717; macro-F1=0.5811; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `temperature_c_now` | 0.17569869 |
| `ph_mean_1h` | 0.16724396 |
| `ph_now` | 0.15191224 |
| `temperature_c_mean_1h` | 0.15058987 |
| `tds_ppm_mean_1h` | 0.04939882 |
| `ph_std_1h` | 0.04171237 |
| `tds_ppm_now` | 0.04100063 |
| `hour_sin` | 0.02748636 |
| `day_cos` | 0.02526132 |
| `tds_ppm_std_1h` | 0.02488381 |
| `temperature_c_delta_3h` | 0.02286413 |
| `hour_cos` | 0.02074133 |
| `day_sin` | 0.01579022 |
| `ph_delta_3h` | 0.01427305 |
| `tds_ppm_delta_3h` | 0.01380802 |
| `temperature_c_std_1h` | 0.01373968 |
| `ph_delta_1h` | 0.01218597 |
| `temperature_c_delta_1h` | 0.01178493 |
| `tds_ppm_delta_1h` | 0.00768619 |
| `missingindicator_temperature_c_delta_1h` | 0.00152367 |
| `missingindicator_ph_mean_1h` | 0.00131910 |
| `missingindicator_tds_ppm_delta_3h` | 0.00131548 |
| `missingindicator_temperature_c_delta_3h` | 0.00117472 |
| `missingindicator_tds_ppm_delta_1h` | 0.00111338 |
| `missingindicator_temperature_c_mean_1h` | 0.00103691 |
| `missingindicator_ph_delta_3h` | 0.00103492 |
| `missingindicator_ph_std_1h` | 0.00085276 |
| `missingindicator_tds_ppm_mean_1h` | 0.00084556 |
| `missingindicator_ph_delta_1h` | 0.00074273 |
| `missingindicator_tds_ppm_std_1h` | 0.00057217 |
| `missingindicator_temperature_c_std_1h` | 0.00040702 |
| `tds_ppm_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/bobsis_raw_1h/permutation_importance.csv`.

### bobsis_raw - 2h

Train/test: 8723/928; accuracy=0.8190; macro-F1=0.5466; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_mean_1h` | 0.16391123 |
| `temperature_c_now` | 0.16288641 |
| `ph_now` | 0.13940811 |
| `temperature_c_mean_1h` | 0.12526103 |
| `tds_ppm_mean_1h` | 0.05625596 |
| `tds_ppm_now` | 0.04869005 |
| `ph_std_1h` | 0.04273583 |
| `hour_cos` | 0.03251967 |
| `temperature_c_delta_3h` | 0.02931100 |
| `hour_sin` | 0.02866109 |
| `day_cos` | 0.02592488 |
| `tds_ppm_std_1h` | 0.02472835 |
| `temperature_c_delta_1h` | 0.01926589 |
| `day_sin` | 0.01826837 |
| `temperature_c_std_1h` | 0.01765106 |
| `tds_ppm_delta_3h` | 0.01572808 |
| `ph_delta_3h` | 0.01560006 |
| `ph_delta_1h` | 0.01268590 |
| `tds_ppm_delta_1h` | 0.00916631 |
| `missingindicator_tds_ppm_delta_3h` | 0.00157813 |
| `missingindicator_ph_delta_3h` | 0.00152632 |
| `missingindicator_temperature_c_delta_1h` | 0.00149957 |
| `missingindicator_temperature_c_delta_3h` | 0.00137417 |
| `missingindicator_tds_ppm_delta_1h` | 0.00130729 |
| `missingindicator_ph_delta_1h` | 0.00104532 |
| `missingindicator_temperature_c_mean_1h` | 0.00076977 |
| `missingindicator_ph_mean_1h` | 0.00061780 |
| `missingindicator_tds_ppm_std_1h` | 0.00044449 |
| `missingindicator_ph_std_1h` | 0.00044065 |
| `missingindicator_temperature_c_std_1h` | 0.00040202 |
| `missingindicator_tds_ppm_mean_1h` | 0.00033519 |
| `tds_ppm_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/bobsis_raw_2h/permutation_importance.csv`.

### bobsis_raw - 3h

Train/test: 8385/873; accuracy=0.7755; macro-F1=0.5164; model reload verified=True.

| Fitur hasil preprocessing | Impurity importance |
|---|---:|
| `ph_mean_1h` | 0.15095572 |
| `temperature_c_now` | 0.13191601 |
| `temperature_c_mean_1h` | 0.12936322 |
| `ph_now` | 0.12238191 |
| `tds_ppm_mean_1h` | 0.05943446 |
| `tds_ppm_now` | 0.05513215 |
| `ph_std_1h` | 0.04668873 |
| `hour_cos` | 0.04486636 |
| `temperature_c_delta_3h` | 0.03371320 |
| `day_cos` | 0.03268333 |
| `hour_sin` | 0.02988669 |
| `tds_ppm_std_1h` | 0.02689523 |
| `day_sin` | 0.02293676 |
| `temperature_c_delta_1h` | 0.02279373 |
| `temperature_c_std_1h` | 0.02038328 |
| `ph_delta_3h` | 0.01819419 |
| `tds_ppm_delta_3h` | 0.01632209 |
| `ph_delta_1h` | 0.01145559 |
| `tds_ppm_delta_1h` | 0.01089634 |
| `missingindicator_temperature_c_delta_1h` | 0.00210936 |
| `missingindicator_tds_ppm_delta_3h` | 0.00191478 |
| `missingindicator_temperature_c_delta_3h` | 0.00166133 |
| `missingindicator_ph_delta_1h` | 0.00158976 |
| `missingindicator_ph_delta_3h` | 0.00148693 |
| `missingindicator_tds_ppm_delta_1h` | 0.00135964 |
| `missingindicator_ph_mean_1h` | 0.00063500 |
| `missingindicator_tds_ppm_std_1h` | 0.00061304 |
| `missingindicator_temperature_c_std_1h` | 0.00054933 |
| `missingindicator_tds_ppm_mean_1h` | 0.00053042 |
| `missingindicator_temperature_c_mean_1h` | 0.00035625 |
| `missingindicator_ph_std_1h` | 0.00029517 |
| `tds_ppm_missing` | 0.00000000 |
| `ph_missing` | 0.00000000 |
| `temperature_c_missing` | 0.00000000 |

Permutation importance: `random_forest_prd_update_experiment/results/bobsis_raw_3h/permutation_importance.csv`.

## 6. Catatan interpretasi dan batas model

- Target pada catfish dan Bobsis adalah proxy risiko masa depan berbasis pH/suhu, bukan label biologis atau ground truth DO/amonia.
- 27 kombinasi seri-horizon berstatus `NOT_TRAINABLE` dan tidak memiliki model final; tidak dicantumkan sebagai parameter/bobot trained model. Rinciannya ada di `random_forest_prd_update_experiment/results/run_summary.json`.
- Hasil tidak boleh digunakan untuk menggerakkan relay; RF tetap shadow sampai tersedia data pilot lele dengan label rujukan independen dan evaluasi kronologis.
- Model disimpan apa adanya dalam Joblib agar seluruh tree dan threshold split dapat dipulihkan. CSV feature importance bukan pengganti file model.
