"""Create the final, evidence-based BanyuWening RF benchmark PDF."""
from __future__ import annotations
import json
from pathlib import Path
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
                                PageBreak, Table, TableStyle, Image, KeepTogether)

ROOT = Path(__file__).resolve().parents[2]
EXP = Path(__file__).resolve().parents[1]
PDF = ROOT / "output" / "pdf" / "laporan_model_random_forest_PRD_upadate.pdf"
TEAL = colors.HexColor("#173A38")
GREEN = colors.HexColor("#287C78")
PALE = colors.HexColor("#E9F2F0")
AMBER = colors.HexColor("#DF9A43")
RED = colors.HexColor("#B74C40")
GRAY = colors.HexColor("#52615F")

def read_inputs():
    s=json.loads((EXP/"results"/"run_summary.json").read_text(encoding="utf-8"))
    inv=json.loads((EXP/"inventory"/"series_inventory.json").read_text(encoding="utf-8"))
    results=[r for r in s["results"] if r.get("status")=="COMPLETED"]
    return s,inv,results

def fmt(v,n=3): return "-" if v is None else f"{v:.{n}f}"

def footer(canvas,doc):
    canvas.saveState(); w,h=landscape(A4)
    canvas.setStrokeColor(colors.HexColor("#D7E1DF")); canvas.setLineWidth(.5)
    canvas.line(13*mm,12*mm,w-13*mm,12*mm)
    canvas.setFillColor(GRAY); canvas.setFont("Helvetica",7.5)
    canvas.drawString(13*mm,7.5*mm,"BanyuWening v2.2 | Kaggle Random Forest benchmark")
    canvas.drawRightString(w-13*mm,7.5*mm,f"Halaman {doc.page}")
    canvas.restoreState()

def img(path,w,h):
    z=Image(str(path)); z._restrictSize(w,h); return z

def p(text,style): return Paragraph(text,style)

def build():
    summary, inventory, results=read_inputs()
    pdf_files=list((ROOT/"ml"/"datasets").glob("*"))
    non_dummy=sum(f.is_file() and f.name!="sensor_readings_dummy.csv" for f in pdf_files)
    trainable_series=sorted({r["series_id"] for r in results})
    not_trainable=summary["not_trainable"]
    fail_count=len(summary["failures"])
    PDF.parent.mkdir(parents=True,exist_ok=True)
    doc=BaseDocTemplate(str(PDF),pagesize=landscape(A4),leftMargin=13*mm,rightMargin=13*mm,
                        topMargin=13*mm,bottomMargin=17*mm,title="Laporan Model Random Forest - PRD BanyuWening v2.2",
                        author="BanyuWening")
    frame=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height,id="normal")
    doc.addPageTemplates([PageTemplate(id="main",frames=frame,onPage=footer)])
    base=getSampleStyleSheet()
    sty={
      "cover":ParagraphStyle("CoverX",parent=base["Title"],fontName="Helvetica-Bold",fontSize=25,leading=31,textColor=TEAL,alignment=TA_CENTER,spaceAfter=10),
      "subtitle":ParagraphStyle("SubX",parent=base["Normal"],fontName="Helvetica",fontSize=11,leading=16,textColor=GRAY,alignment=TA_CENTER,spaceAfter=6),
      "h1":ParagraphStyle("H1X",parent=base["Heading1"],fontName="Helvetica-Bold",fontSize=16,leading=19,textColor=TEAL,spaceBefore=4,spaceAfter=6),
      "h2":ParagraphStyle("H2X",parent=base["Heading2"],fontName="Helvetica-Bold",fontSize=10.5,leading=13,textColor=GREEN,spaceBefore=4,spaceAfter=4),
      "body":ParagraphStyle("BodyX",parent=base["BodyText"],fontName="Helvetica",fontSize=8.1,leading=11,textColor=colors.HexColor("#273735"),spaceAfter=4),
      "small":ParagraphStyle("SmallX",parent=base["BodyText"],fontName="Helvetica",fontSize=6.9,leading=8.8,textColor=GRAY,spaceAfter=3),
      "center":ParagraphStyle("CenterX",parent=base["BodyText"],fontName="Helvetica",fontSize=8,leading=10,alignment=TA_CENTER,textColor=GRAY),
      "warning":ParagraphStyle("WarnX",parent=base["BodyText"],fontName="Helvetica-Bold",fontSize=8.7,leading=12,textColor=RED,backColor=colors.HexColor("#FBEFEB"),borderPadding=7,spaceBefore=4,spaceAfter=7),
    }
    story=[]
    # Cover and actual result count.
    story += [Spacer(1,20*mm),p("Laporan Pengujian<br/>Random Forest",sty["cover"]),
              p("Eksperimen Kaggle terhadap tujuan PRD BanyuWening v2.2",sty["subtitle"]),Spacer(1,5*mm)]
    cards=Table([[p(f"<b>{non_dummy}</b><br/>file Kaggle pengganti",sty["center"]),
                  p(f"<b>{summary['completed']}</b><br/>model selesai",sty["center"]),
                  p(f"<b>{len(not_trainable)}</b><br/>eksperimen tidak layak",sty["center"]),
                  p(f"<b>{fail_count}</b><br/>kegagalan runtime",sty["center"])]],colWidths=[61*mm]*4,rowHeights=[22*mm])
    cards.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),PALE),("BOX",(0,0),(-1,-1),.6,GREEN),
                               ("INNERGRID",(0,0),(-1,-1),.4,colors.white),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    story += [cards,Spacer(1,9*mm),
              p("<b>Keputusan:</b> pencarian Kaggle tidak menemukan satu dataset yang mencakup kelima jenis sensor modul sekaligus dan memiliki target risiko lele 1-3 jam. Hasil berikut adalah benchmark awal dari data sensor parsial, bukan bukti akurasi biologis kolam BanyuWening.",sty["body"]),
              p("STATUS MODEL: SHADOW / BELUM VALIDASI LAPANGAN. Jangan gunakan hasil ini untuk mengendalikan relay atau menyatakan akurasi produksi. Random Forest yang diuji adalah RandomForestClassifier dari scikit-learn.",sty["warning"]),
              Spacer(1,6*mm),p("Tanggal eksperimen: 20 November 2026<br/>Random state: 42 | Horizon: 60, 120, 180 menit<br/>Sumber pengganti tersimpan di ml/datasets; sensor_readings_dummy.csv dipertahankan tetapi tidak digunakan.",sty["center"]),PageBreak()]

    # Sensor map and Kaggle search findings.
    story += [p("1. Tujuan dan pemetaan sensor",sty["h1"]),
              p("Modul Sensor Kolam v2 membawa lima kanal per kolam. Tiga kanal analog masuk ADC, sedangkan suhu dan level memakai jalur digital. DO/NH3 hanya alat ground-truth manual pada pilot, bukan sensor paket standar.",sty["body"])]
    sens=[['Kanal modul','Jenis / sinyal','ADS1115','Ditemukan pada Kaggle terpilih']]
    sens += [["pH PH-4502C","Analog","Ya","Catfish IoT; Tilapia IoT; Bobsis"],
             ["Suhu DS18B20","Digital 1-Wire","Tidak","Catfish IoT; Tilapia IoT; Bobsis*"],
             ["TDS + MOSFET","Analog","Ya","Bobsis"],
             ["Turbiditas epoxy","Analog","Ya","Catfish IoT; Tilapia IoT"],
             ["Float switch","Digital","Tidak","Tidak ada"]]
    t=Table(sens,colWidths=[48*mm,40*mm,28*mm,116*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),
       ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),7.4),
       ("GRID",(0,0),(-1,-1),.35,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
       ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story += [t,Spacer(1,3*mm),p("*Bobsis hanya menyebut water temperature, tidak mengonfirmasi model DS18B20. Jadi tidak dihitung sebagai kecocokan model probe.",sty["small"]),
      p("Matriks status PRD v2.3",sty["h2"]),
      p("Matriks berikut menjadi definisi operasional sistem. Hanya suhu dan pH yang dapat membentuk label proxy benchmark saat ini; batas TDS, turbiditas, dan tinggi air memerlukan baseline serta validasi per kolam.",sty["body"])]
    status_matrix=[["Parameter","Aman","Waspada","Bahaya"],
      ["Suhu","Dalam rentang 25-30 C","Mendekati batas (22-<25 atau >30-33 C)","Keluar dari rentang (<22 atau >33 C)"],
      ["pH","Dalam rentang 6,5-8,5","Mendekati batas (6,0-<6,5 atau >8,5-8,8)","Keluar dari rentang (<6,0 atau >8,8)"],
      ["TDS","Dalam rentang lokal tervalidasi","Menyimpang dari baseline","Penyimpangan ekstrem"],
      ["Turbidity","Dalam rentang lokal tervalidasi","Meningkat dari baseline","Peningkatan ekstrem"],
      ["Ketinggian air","Dalam rentang operasional kolam","Mendekati batas minimum/maksimum","Keluar dari batas operasional"]]
    t=Table(status_matrix,colWidths=[35*mm,54*mm,75*mm,76*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),
       ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),7.2),
       ("GRID",(0,0),(-1,-1),.35,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
       ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [t,p("Catatan: Rentang suhu dan pH mengacu pada SNI 8228.4:2015. Untuk TDS, turbidity, dan ketinggian air, belum ada ambang universal yang dapat langsung ditetapkan dari sumber di atas. Batasnya harus ditentukan melalui pengukuran kolam dan validasi lapangan. Karena batas TDS, turbidity, dan ketinggian air belum tervalidasi secara lokal, ketiganya tidak boleh dipakai untuk membuat label target AMAN/WASPADA/BAHAYA pada benchmark publik; tetap dipakai sebagai fitur atau dipantau bila tersedia pada dataset pengujian dengan catatan tersebut.",sty["small"]),
      p("2. Pencarian dan pemilihan Kaggle",sty["h1"]),
      p("Kaggle CLI 1.7.4.5 melakukan pencarian relevansi dengan kombinasi istilah pH, TDS, turbidity, water level, DS18B20, fish pond, catfish, aquaculture, contamination, water quality, dan time series. Tidak ada hasil exact-match. Dataset dipilih karena menutup sebagian sensor atau tujuan prediksi; file yang tidak cocok tidak dipaksakan.",sty["body"])]
    src=[['Dataset Kaggle','Isi yang tercatat','Kecocokan dan lisensi']]
    src += [[p("Ogbuokiri / Sensor Based Aquaponics Fish Pond Datasets<br/><link href='https://www.kaggle.com/datasets/ogbuokiriblessing/sensor-based-aquaponics-fish-pond-datasets' color='#287C78'>Buka halaman Kaggle</link>",sty["small"]),p("11 file seri kolam lele; suhu, pH, turbidity; DO/NH3/nitrat tambahan",sty["small"]),p("Tujuan catfish dekat, hanya 3/5 kanal. CC BY 4.0. 4 seri layak diuji.",sty["small"])],
            [p("Bobsis / A Simple Dataset of Aquaponic Fish Pond IoT<br/><link href='https://www.kaggle.com/datasets/bobsis/small-aquaculture-fishpond' color='#287C78'>Buka halaman Kaggle</link>",sty["small"]),p("Dua varian waktu pH, TDS, suhu",sty["small"]),p("3/5 kanal; raw berlabel proxy saja, filtered tidak punya cukup kelas test. CC BY 4.0. Satu lineage, bukan dua sampel independen.",sty["small"])],
            [p("Dumlao / IoT Monitoring of Water Quality and Tilapia<br/><link href='https://www.kaggle.com/datasets/jocelyndumlao/iot-monitoring-of-water-quality-and-tilapia' color='#287C78'>Buka halaman Kaggle</link>",sty["small"]),p("4,383 baris hourly; pH, suhu, turbidity, DO; Health Status",sty["small"]),p("Tujuan kesehatan dekat, tetapi ikan tilapia dan test set hanya Stable. CC0-1.0; tidak menghasilkan model evaluasi yang layak.",sty["small"])],
            [p("APGopi / Fish Pond Water Contamination Dataset<br/><link href='https://www.kaggle.com/datasets/apgopi/fish-pond-water-contamination-dataset' color='#287C78'>Buka halaman Kaggle</link>",sty["small"]),p("pH, suhu, turbidity, DO, ammonia, nitrate, manganese",sty["small"]),p("Tujuan kontaminasi dekat, tetapi lisensi tercatat unknown; tidak dipakai training.",sty["small"])]]
    t=Table(src,colWidths=[80*mm,83*mm,69*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),
       ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),6.9),
       ("LEADING",(0,0),(-1,-1),8.5),("GRID",(0,0),(-1,-1),.35,colors.HexColor("#CCD8D5")),
       ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),("VALIGN",(0,0),(-1,-1),"TOP"),
       ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))
    story += [t,PageBreak()]

    # Methodology and filtering/exclusions.
    story += [p("3. Metode eksperimen",sty["h1"]),
      p("Batas eksperimen: 14 file non-dummy dari tiga dataset Kaggle ditempatkan di ml/datasets; dummy lama dibiarkan, tetapi tidak digunakan. Setiap seri/file diproses terpisah. Dua berkas Bobsis adalah raw/filtered lineage yang sama. Data catfish dan Bobsis diagregasi ke median 5 menit. File tilapia berfrekuensi satu jam dan diuji terhadap label Health Status sumber, tetapi tidak lulus kriteria keberagaman label pada test.",sty["body"]),
      p("Eligibility/watchdog: pH 0-14, suhu 0-40 C, TDS 0-10.000 ppm, turbiditas 0-100 NTU. Nilai rail turbidity 100 diisolasi sebagai saturasi. Window hanya dipakai bila pH/suhu saat ini dan target masa depan tersedia. Tidak ada imputasi sebelum split; median imputer di-fit pada train. Fitur meliputi nilai saat ini, rolling mean/std 1 jam, delta 1/3 jam, indikator missing, dan siklus jam/hari.",sty["body"]),
      p("Label catfish/Bobsis: proxy pada horizon masa depan dari pH dan suhu sesuai matriks PRD v2.3 (SNI 8228.4:2015). AMAN bila keduanya dalam rentang operasi (pH 6,5-8,5; suhu 25-30 C); WASPADA pada buffer mendekati batas (pH 6,0-<6,5 atau >8,5-8,8; suhu 22-<25 atau >30-33 C); BAHAYA di luar rentang buffer. Bila dataset memiliki data TDS (mis. Bobsis) atau turbidity (mis. Catfish/Tilapia), keduanya tetap dipakai sebagai fitur prediktor pengujian (_now, _mean_1h, _std_1h, _delta_1h/3h, _missing) dengan catatan bahwa ambangnya belum tervalidasi secara lokal sehingga tidak dipakai membentuk label target AMAN/WASPADA/BAHAYA. Ketinggian air belum tersedia pada dataset publik dan DO/NH3 tidak dipakai karena kalibrasi antar-sumber tidak seragam.",sty["body"]),
      p("Split 80:20 kronologis, tanpa target train yang melewati batas split. Purged 3-fold TimeSeriesSplit dijalankan pada seri dengan cukup data. Model baseline per seri/horizon: RandomForestClassifier, n_estimators=100, max_depth=18, min_samples_leaf=2, random_state=42, n_jobs=-1; class_weight='balanced' jika rasio kelas train >1.5. Pipeline median imputation dan RF disimpan via Joblib lalu dimuat ulang untuk verifikasi prediksi.",sty["body"]),
      p("Eksperimen dengan <100 data train, <100 data test, <2 kelas train, atau <2 kelas test ditandai NOT_TRAINABLE. Metrik macro menggunakan label lengkap AMAN/WASPADA/BAHAYA sehingga kelas yang tidak muncul pada test tidak menyembunyikan kegagalan deteksi.",sty["body"]),
      p("Rujukan rentang budidaya: <link href='https://lahanrawa.bsip.pertanian.go.id/storage/assets/uploads/publikasi/VxKAveS8lfXXnD6UEhW77QANsI0KkTfyKn13DCQP.pdf' color='#287C78'>Petunjuk teknis BSIP Kementerian Pertanian</link>. Semua hasil tetap berstatus proxy/shadow.",sty["small"]),
      p("4. Ringkasan kelayakan data",sty["h1"])]
    elig=[['Seri sumber','Model selesai','Alasan jika tidak selesai']]
    for sid in sorted({r["series_id"] for r in summary["results"]}):
        arr=[r for r in summary["results"] if r["series_id"]==sid]
        done=sum(r["status"]=="COMPLETED" for r in arr)
        if done==3:
            detail="3 horizon selesai"
        else:
            reasons=set()
            for r in arr:
                if r["status"]=="COMPLETED": continue
                reason=r.get("reason","")
                if "test rows <100" in reason: reasons.add("test <100 window valid")
                if "test has <2 classes" in reason: reasons.add("test hanya satu kelas")
                if "train rows <100" in reason: reasons.add("train <100 window")
                if "train has <2 classes" in reason: reasons.add("train hanya satu kelas")
            detail=f"{3-done} horizon tidak dinilai: " + "; ".join(sorted(reasons))
        elig.append([sid,str(done),detail])
    t=Table(elig,colWidths=[47*mm,26*mm,159*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),
      ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),6.8),
      ("LEADING",(0,0),(-1,-1),8.4),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD8D5")),
      ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),("VALIGN",(0,0),(-1,-1),"TOP")]))
    story += [t,PageBreak()]

    # Global results table and chart.
    story += [p("5. Hasil evaluasi",sty["h1"]),
              p(f"Dari 42 percobaan (14 seri x 3 horizon), {summary['completed']} model selesai, {len(not_trainable)} tidak layak karena data/jumlah kelas test, dan {fail_count} gagal runtime. Semua {summary['completed']} model berhasil dimuat ulang dengan Joblib. Angka akurasi tidak berdiri sendiri: kelas sangat timpang membuat macro-F1 jauh lebih rendah.",sty["body"])]
    rows=[["Seri","Horizon","Train","Test","Test A/W/B","Accuracy","P macro","R macro","F1 macro","F1 weighted","Train F1"]]
    for r in results:
        cd=r["class_distribution_test"]
        rows.append([r["series_id"],r["horizon"],str(r["train_size"]),str(r["test_size"]),
                     f"{int(float(cd.get('0.0',0)))}/{int(float(cd.get('1.0',0)))}/{int(float(cd.get('2.0',0)))}",
                     fmt(r["accuracy"]),fmt(r["precision_macro"]),fmt(r["recall_macro"]),fmt(r["f1_macro"]),fmt(r["f1_weighted"]),fmt(r["train_f1_macro"])])
    t=Table(rows,colWidths=[35*mm,14*mm,16*mm,16*mm,25*mm,19*mm,20*mm,20*mm,20*mm,21*mm,18*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),
      ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),6.5),
      ("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
      ("ALIGN",(2,1),(-1,-1),"RIGHT"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
      ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [t,Spacer(1,2*mm),p("Test A/W/B = jumlah test untuk AMAN/WASPADA/BAHAYA. P = precision; R = recall. F1 macro menggunakan tiga kelas penuh untuk proxy catfish/Bobsis, termasuk nol bagi kelas yang tidak muncul.",sty["small"]),PageBreak(),
      p("6. Perbandingan horizon",sty["h1"])]
    cmp=EXP/"results"/"comparison"/"horizon_macro_f1.png"
    if cmp.exists(): story += [img(cmp,250*mm,115*mm),p("Grafik menunjukkan seri yang dapat dinilai saja. Perbandingan lintas seri terbatas karena target, frekuensi, sensor, dan distribusi kelas berbeda.",sty["small"])]
    # Evidence-based tree-count selection.
    tuning=json.loads((EXP/"results"/"comparison"/"forest_size_tuning.json").read_text(encoding="utf-8"))
    tune_df=pd.read_csv(EXP/"results"/"comparison"/"forest_size_cv_summary.csv")
    holdout=pd.read_csv(EXP/"results"/"comparison"/"holdout_100_vs_300.csv")
    story += [PageBreak(),p("7. Tuning jumlah pohon dan pemilihan model",sty["h1"]),
      p("Jumlah pohon diuji pada 100, 200, 300, 500, dan 800 menggunakan 3-fold TimeSeriesSplit kronologis pada 15 kombinasi trainable (45 fold). Tuning berlangsung pada bagian training; holdout akhir tidak dipakai memilih n_estimators. Aturan yang ditetapkan adalah mengambil jumlah pohon terkecil yang mean macro-F1-nya tidak lebih dari 0,005 di bawah skor validasi terbaik.",sty["body"])]
    tune_rows=[["Pohon","CV mean macro-F1","SD fold","Train macro-F1","Gap train-validasi","Tambahan fit / fold (s)"]]
    for r in tune_df.itertuples():
        tune_rows.append([str(int(r.n_estimators)),fmt(r.mean_validation_macro_f1,6),fmt(r.std_validation_macro_f1,6),fmt(r.mean_train_macro_f1,6),fmt(r.mean_generalization_gap,6),fmt(r.mean_incremental_fit_seconds,3)])
    tt=Table(tune_rows,colWidths=[25*mm,38*mm,30*mm,34*mm,39*mm,44*mm],repeatRows=1)
    tt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),7),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),("ALIGN",(0,1),(-1,-1),"RIGHT")]))
    story += [tt,Spacer(1,3*mm),img(EXP/"results"/"comparison"/"forest_size_cv_curve.png",190*mm,90*mm),
      p(f"Model final memakai {tuning['selected_n_estimators']} pohon. Puncak CV adalah {tuning['peak_validation_macro_f1']:.6f} pada 800 pohon; skor 100 pohon {float(tune_df.loc[tune_df.n_estimators==100,'mean_validation_macro_f1'].iloc[0]):.6f}, selisih hanya 0,000561. Maka 100 adalah ukuran paling kecil di dalam toleransi 0,005. Pada holdout berpasangan, mean macro-F1 100 pohon {holdout.macro_f1_baseline.mean():.6f}, sementara 300 pohon {holdout.macro_f1_candidate.mean():.6f}; rasio waktu fit 300/100 rata-rata {holdout.train_seconds_ratio.mean():.2f}x.",sty["body"]),
      p("Gap train-validasi rata-rata sekitar 0,349 tetap besar dan tidak membaik secara berarti saat pohon ditambah. Jadi pemilihan 100 pohon menghemat ukuran/waktu pada skor yang setara dalam toleransi, tetapi tidak membuat model sempurna atau menjamin kinerja pada kolam baru. Generalisasi memerlukan label pilot terukur dan uji independen lintas pond/waktu.",sty["warning"]),PageBreak()]
    story += [p("Catatan hasil utama",sty["h2"])]
    df=pd.DataFrame(results)
    best=df.loc[df.f1_macro.idxmax()]
    story += [p(f"Nilai macro-F1 tertinggi adalah {best['f1_macro']:.3f} pada {best['series_id']} horizon {best['horizon']}, dengan {best['test_size']} sampel test. Catfish pond6 hanya memiliki dua kelas pada test, sehingga skor macro-F1 0.667 tidak menguji kelas AMAN. Catfish pond2/pond7/pond9 memiliki akurasi tinggi tetapi macro-F1 sekitar 0.29-0.35 karena kelas BAHAYA mendominasi dan kelas minor sulit dideteksi. Bobsis raw memiliki macro-F1 0.516-0.581, tetapi hanya kelas WASPADA/BAHAYA yang muncul pada test dan data ini bukan validasi independen per pond.",sty["body"]),
      p("Semua model menunjukkan train macro-F1 jauh lebih tinggi daripada test, mengindikasikan overfitting dan pergeseran distribusi waktu. Tidak ada hasil yang mendukung kontrol otomatis.",sty["warning"]),PageBreak()]

    # Per-series details with three real confusion matrices and feature importances.
    for sid in trainable_series:
        group=sorted([r for r in results if r["series_id"]==sid],key=lambda r:r["horizon"])
        story += [p(f"7. Detail hasil: {sid}",sty["h1"])]
        detail=[["Horizon","Train/Test","Acc.","Macro P","Macro R","Macro F1","Weighted F1","CV macro F1","Gap train-test"]]
        for r in group:
            detail.append([r["horizon"],f"{r['train_size']}/{r['test_size']}",fmt(r["accuracy"]),fmt(r["precision_macro"]),fmt(r["recall_macro"]),fmt(r["f1_macro"]),fmt(r["f1_weighted"]),fmt(r["cross_validation"].get("mean")),fmt(r["generalization_gap_f1"])])
        t=Table(detail,colWidths=[23*mm,31*mm,20*mm,22*mm,22*mm,22*mm,26*mm,28*mm,27*mm],repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),
          ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),6.7),
          ("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
          ("ALIGN",(1,1),(-1,-1),"RIGHT"),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
        story += [t,Spacer(1,2*mm)]
        ims=[]
        for r in group:
            q=EXP/"results"/r["experiment"]
            ims.append(img(q/"confusion_matrix.png",75*mm,55*mm))
        story += [p("Confusion matrices: aktual di sumbu Y, prediksi di sumbu X.",sty["small"]),
                  Table([ims],colWidths=[83*mm]*3,style=TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER"),("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2)])),
                  p("Top 3 fitur per horizon (impurity-based)",sty["h2"])]
        features_rows=[["Horizon","Fitur tertinggi"]]
        for r in group:
            fi=pd.read_csv(EXP/"results"/r["experiment"]/"feature_importance.csv").head(3)
            features_rows.append([r["horizon"],"; ".join(f"{z.feature} ({z.importance:.3f})" for z in fi.itertuples())])
        t=Table(features_rows,colWidths=[25*mm,220*mm])
        t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),colors.white),
          ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),7),
          ("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD8D5")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
          ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
        story += [t,p("Impurity importance menunjukkan asosiasi model dan dapat bias terhadap skala/jumlah nilai. Permutation importance tersedia di results; fitur penting bukan penjelasan kausal.",sty["small"]),PageBreak()]

    # Conclusion and deliverables.
    story += [p("8. Kesimpulan, batasan, dan tindak lanjut",sty["h1"]),
      p("RandomForestClassifier berhasil dilatih pada 15 kombinasi seri/horizon yang memenuhi batas minimum kelayakan. Sembilan seri x tiga horizon tidak layak dilatih: data uji kurang dari 100, kelas train/test kurang dari dua, atau keduanya. Tidak ada kegagalan runtime pada hasil final. Seri dengan hasil valid tetap menunjukkan ketimpangan kelas dan generalization gap besar; performa sekarang belum layak untuk keputusan biologis atau aktuator.",sty["body"]),
      p("Penyebab utama keterbatasan: tidak ada Kaggle source dengan kelima sensor modul; label catfish adalah proxy pH/suhu, bukan label DO/NH3 terukur independen; TDS, turbiditas, dan tinggi air belum mempunyai batas lokal tervalidasi sehingga belum memengaruhi label; catfish telemetry memiliki fault/out-of-range/rail saturation; dataset Bobsis tidak menyediakan label risiko; target tilapia berbeda spesies dan kehilangan kelas At Risk pada test; dan distribusi data antar-waktu sangat timpang. Kedua varian Bobsis adalah lineage yang sama dan tidak boleh dianggap dua replikasi independen.",sty["body"]),
      p("Keputusan PRD: gunakan Edge Fuzzy deterministic sebagai satu-satunya pengendali lokal. RF cloud tetap shadow. Bangun data pilot lele 90 hari dengan lima kanal standar, tambahkan pembacaan DO meter dan test kit ammonia/nitrit berkalibrasi sebagai label independen, simpan pond_id/fault/event logs, lalu retrain dan validasi pada waktu/kolam yang tidak pernah dilihat. Agent hanya mengevaluasi atau mengusulkan retraining; engineer HITL tetap menyetujui model/config sebelum deployment.",sty["body"]),
      p("Artefak: inventaris lama dan baru, source hashes, audit data, metrik JSON, classification report, confusion matrix, class distribution, feature importance, permutation importance, perbandingan CSV/PNG, dan model Joblib berada di random_forest_prd_update_experiment/. Model tersimpan pada models/ dan model reload diverifikasi untuk semua model yang selesai. Parameter lengkap, class-weight factors, dan seluruh feature-importance weights ada di brief/parameter &amp; weight.md.",sty["small"]),
      p("Parameter final: 100 trees dipilih melalui tuning ukuran forest 100/200/300/500/800 dengan chronological CV; max_depth 18, min_samples_leaf 2, random_state 42, n_jobs=-1; class_weight balanced sesuai rasio kelas train.",sty["small"])]
    doc.build(story)
    print(f"Created {PDF}")

if __name__=="__main__": build()
