import pool from '../config/database';
import type { LineString } from 'geojson';

interface Route {
  id: string;
  name: string;
  description: string;
  stops: LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

interface RouteWithGeoJSON extends Omit<Route, 'stops'> {
  stops: LineString;
}

interface BusLocation {
  bus_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ETAInfo {
  bus_id: string;
  route_id: string;
  current_location: [number, number];
  next_stop: string;
  distance_remaining: number;
  estimated_arrival_minutes: number;
  is_near_stop: boolean;
}

export class RouteService {
  static async calculateETA(
    busLocation: BusLocation,
    routeId: string
  ): Promise<ETAInfo | null> {
    try {
      const query = `
        WITH route_geometry AS (
          SELECT stops, distance_km, estimated_duration_minutes
          FROM routes WHERE id = $1 AND is_active = true
        ),
        bus_point AS (
          SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326) as location
        ),
        distance_calc AS (
          SELECT 
            r.stops,
            r.distance_km,
            r.estimated_duration_minutes,
            ST_Distance(ST_Transform(b.location, 3857), ST_Transform(r.stops, 3857)) / 1000 as distance_from_route_km,
            ST_LineLocatePoint(r.stops, b.location) as progress_along_route
          FROM route_geometry r, bus_point b
        ),
        remaining_distance AS (
          SELECT 
            stops,
            distance_km,
            estimated_duration_minutes,
            distance_from_route_km,
            progress_along_route,
            CASE 
              WHEN progress_along_route >= 0 AND progress_along_route <= 1 THEN
                distance_km * (1 - progress_along_route)
              ELSE
                distance_km + distance_from_route_km
            END as remaining_distance_km
          FROM distance_calc
        )
        SELECT 
          $4 as bus_id,
          $1 as route_id,
          ARRAY[$2, $3] as current_location,
          remaining_distance_km,
          CASE WHEN remaining_distance_km <= 0.5 THEN true ELSE false END as is_near_stop,
          CASE 
            WHEN remaining_distance_km > 0 THEN
              ROUND((remaining_distance_km / distance_km) * estimated_duration_minutes)
            ELSE 0
          END as estimated_arrival_minutes
        FROM remaining_distance;
      `;

      const result = await pool.query(query, [
        routeId,
        busLocation.longitude,
        busLocation.latitude,
        busLocation.bus_id,
      ]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        bus_id: row.bus_id,
        route_id: row.route_id,
        current_location: row.current_location,
        next_stop: 'Next Stop',
        distance_remaining: parseFloat(row.remaining_distance_km),
        estimated_arrival_minutes: parseInt(row.estimated_arrival_minutes),
        is_near_stop: row.is_near_stop,
      };
    } catch (error) {
      console.error('❌ Error calculating ETA:', error);
      return null;
    }
  }

  static async getAllRoutes(): Promise<RouteWithGeoJSON[]> {
    try {
      const query = `
        SELECT 
          id, name, description,
          ST_AsGeoJSON(stops)::json as stops,
          distance_km, estimated_duration_minutes,
          route_map_url,
          is_active, created_at, updated_at
        FROM routes WHERE is_active = true ORDER BY name;
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching routes:', error);
      return [];
    }
  }

  static async getRouteById(routeId: string): Promise<RouteWithGeoJSON | null> {
    try {
      const query = `
        SELECT 
          id, name, description,
          ST_AsGeoJSON(stops)::json as stops,
          distance_km, estimated_duration_minutes,
          route_map_url,
          is_active, created_at, updated_at
        FROM routes WHERE id = $1 AND is_active = true;
      `;
      const result = await pool.query(query, [routeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      return null;
    }
  }

  static async createRoute(routeData: {
    name: string;
    description: string;
    coordinates: [number, number][];
    distance_km: number;
    estimated_duration_minutes: number;
  }): Promise<Route | null> {
    try {
      const coordinates = routeData.coordinates
        .map(coord => `${coord[0]} ${coord[1]}`)
        .join(',');
      const lineString = `LINESTRING(${coordinates})`;

      const query = `
        INSERT INTO routes (name, description, stops, distance_km, estimated_duration_minutes)
        VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5) RETURNING *;
      `;

      const result = await pool.query(query, [
        routeData.name,
        routeData.description,
        lineString,
        routeData.distance_km,
        routeData.estimated_duration_minutes,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating route:', error);
      return null;
    }
  }

  static async assignBusToRoute(
    busId: string,
    routeId: string
  ): Promise<boolean> {
    try {
      const query = `UPDATE buses SET route_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`;
      const result = await pool.query(query, [busId, routeId]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('❌ Error assigning bus to route:', error);
      return false;
    }
  }

  static async checkBusNearStop(
    busLocation: BusLocation,
    routeId: string
  ): Promise<{
    is_near_stop: boolean;
    distance_to_stop: number;
  }> {
    try {
      const query = `
        WITH bus_point AS (
          SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326) as location
        ),
        route_stops AS (
          SELECT 
            ST_Distance(ST_Transform(b.location, 3857), ST_Transform(r.stops, 3857)) / 1000 as distance_to_route_km
          FROM routes r, bus_point b
          WHERE r.id = $1 AND r.is_active = true
        )
        SELECT 
          CASE WHEN distance_to_route_km <= 0.5 THEN true ELSE false END as is_near_stop,
          distance_to_route_km
        FROM route_stops;
      `;

      const result = await pool.query(query, [
        routeId,
        busLocation.longitude,
        busLocation.latitude,
      ]);

      if (result.rows.length === 0) {
        return { is_near_stop: false, distance_to_stop: 0 };
      }

      const row = result.rows[0];
      return {
        is_near_stop: row.is_near_stop,
        distance_to_stop: parseFloat(row.distance_to_route_km),
      };
    } catch (error) {
      console.error('❌ Error checking bus near stop:', error);
      return { is_near_stop: false, distance_to_stop: 0 };
    }
  }

  static async updateRoute(
    routeId: string,
    routeData: Partial<{
      name: string;
      description: string;
      coordinates: [number, number][];
      distance_km: number;
      estimated_duration_minutes: number;
      is_active: boolean;
    }>
  ): Promise<Route | null> {
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic update query
      if (routeData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(routeData.name);
      }
      if (routeData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(routeData.description);
      }
      if (routeData.coordinates !== undefined) {
        const coordinates = routeData.coordinates
          .map(coord => `${coord[0]} ${coord[1]}`)
          .join(',');
        const lineString = `LINESTRING(${coordinates})`;
        updateFields.push(`stops = ST_GeomFromText($${paramCount++}, 4326)`);
        values.push(lineString);
      }
      if (routeData.distance_km !== undefined) {
        updateFields.push(`distance_km = $${paramCount++}`);
        values.push(routeData.distance_km);
      }
      if (routeData.estimated_duration_minutes !== undefined) {
        updateFields.push(`estimated_duration_minutes = $${paramCount++}`);
        values.push(routeData.estimated_duration_minutes);
      }
      if (routeData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(routeData.is_active);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(routeId);

      const query = `
        UPDATE routes 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *;
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating route:', error);
      return null;
    }
  }

  static async deleteRoute(routeId: string): Promise<Route | null> {
    try {
      const query = 'DELETE FROM routes WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [routeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error deleting route:', error);
      return null;
    }
  }
}
