export function exportDataAsJSON() {
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("wallbt_") || key.startsWith("t_"))) {
      data[key] = localStorage.getItem(key);
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wallbt_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

export function importDataFromJSON(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === "string") {
            localStorage.setItem(key, value);
          }
        });
        resolve(true);
      } catch (err) {
        console.error("Erro ao importar JSON", err);
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}
