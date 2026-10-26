
import matplotlib.pyplot as plt

# ==========================================
# BURNDOWN CHART CIRCLO
# Sprint 1 selesai, minggu ke-11
# ==========================================

# Sumbu X
sprints = ["Start", "Sprint 1", "Sprint 2", "Sprint 3"]

# Ideal burndown berdasarkan grafik sebelumnya
ideal_burndown = [47, 27, 9, 0]

# Actual burndown
# 47 = total effort awal
# Ubah nilai Sprint 1 berdasarkan sisa effort aktual
actual_burndown = [47, 36.9, None, None]

# ==========================================
# VISUALISASI
# ==========================================

plt.figure(figsize=(12, 6))

# Garis ideal
plt.plot(
    sprints,
    ideal_burndown,
    color="#91A889",
    linewidth=2.5,
    marker="o",
    markersize=5,
    label="Ideal Burndown"
)

# Tampilkan actual hanya sampai Sprint 1 selesai
actual_x = []
actual_y = []

for i, value in enumerate(actual_burndown):
    if value is not None:
        actual_x.append(sprints[i])
        actual_y.append(value)

plt.plot(
    actual_x,
    actual_y,
    color="#FF5CA8",
    linewidth=2,
    linestyle="--",
    marker="o",
    markersize=7,
    label="Actual Burndown"
)

# Label nilai ideal
for x, y in zip(sprints, ideal_burndown):
    plt.annotate(
        str(y),
        (x, y),
        textcoords="offset points",
        xytext=(8, -13),
        ha="center",
        color="#5B7652",
        fontsize=9
    )

# Label nilai aktual
for x, y in zip(actual_x, actual_y):
    plt.annotate(
        str(y),
        (x, y),
        textcoords="offset points",
        xytext=(0, 10),
        ha="center",
        color="#FF3D96",
        fontsize=9
    )

# Judul dan sumbu
plt.title("Burndown Chart CIRCLO", fontsize=15)
plt.xlabel("Total Sprint")
plt.ylabel("Total Effort (story point)")

plt.ylim(-2, 52)
plt.grid(True, linestyle="--", alpha=0.5)
plt.legend()
plt.tight_layout()

# Simpan gambar untuk laporan
plt.savefig(
    "burndown_chart_circlo.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
