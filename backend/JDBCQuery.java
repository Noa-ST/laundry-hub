import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class JDBCQuery {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/laundry_db", "postgres", "123456");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT id, name, is_active, latitude, longitude FROM shops");
            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id") + " - " + rs.getString("name") + " - Active: " + rs.getBoolean("is_active") + " - Lat: " + rs.getDouble("latitude") + " - Lng: " + rs.getDouble("longitude"));
            }
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
