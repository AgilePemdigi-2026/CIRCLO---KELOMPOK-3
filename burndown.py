
import matplotlib.pyplot as plt

# ==========================================
# BURNDOWN CHART CIRCLO
# Sprint 3 - Minggu Pertama
# ==========================================

# Sumbu X
sprints = [
    "Start",
    "Sprint 1",
    "Sprint 2",
    "Sprint 3\n(Minggu 1)"
]

# Ideal burndown
ideal_burndown = [47, 27, 9, 0]

# Actual burndown
actual_burndown = [47, 36.9, 9, 9]

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
    markersize=6,
    label="Ideal Burndown"
)

# Garis aktual
plt.plot(
    sprints,
    actual_burndown,
    color="#FF5CA8",
    linewidth=2.5,
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
        xytext=(0, -15),
        ha="center",
        color="#5B7652",
        fontsize=9
    )

# Label nilai aktual
for x, y in zip(sprints, actual_burndown):
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
plt.ylabel("Total Effort (Story Point)")

plt.ylim(-2, 52)
plt.grid(True, linestyle="--", alpha=0.5)
plt.legend()
plt.tight_layout()

# Simpan gambar
plt.savefig(
    "burndown_chart_circlo.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
