//Test code only

import { db } from "@/database/db";
import { questions } from "@/database/schema";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  const [dbStatus, setDbStatus] = useState<string>("Checking database...");

  useEffect(() => {
    async function checkDb() {
      try {
        const rows = await db.select().from(questions);
        console.log(" [DB Check] Database is ALIVE! Rows count:", rows.length, rows);
        setDbStatus(` Database is ALIVE! (${rows.length} rows found)`);
      } catch (err) {
        console.error("❌ [DB Check] Database query error:", err);
        setDbStatus(`❌ Database Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    checkDb();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{dbStatus}</Text>
      <Text style={styles.subText}>Check your Metro console for the log output</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1b1b",
    padding: 20,
  },
  statusText: {
    color: "#a6f63cff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
});

