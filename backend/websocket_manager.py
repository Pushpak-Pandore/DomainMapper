"""
WebSocket Manager for Real-time Updates
"""
import json
import asyncio
from typing import Dict, List, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections
        self.active_connections: Dict[str, WebSocket] = {}
        # Store subscriptions by scan_id
        self.scan_subscriptions: Dict[str, List[str]] = {}
        # Store user subscriptions (for dashboard updates)
        self.dashboard_subscriptions: List[str] = []

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept WebSocket connection and store it"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected via WebSocket")

    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Remove from scan subscriptions
        for scan_id in list(self.scan_subscriptions.keys()):
            if client_id in self.scan_subscriptions[scan_id]:
                self.scan_subscriptions[scan_id].remove(client_id)
                if not self.scan_subscriptions[scan_id]:
                    del self.scan_subscriptions[scan_id]
        
        # Remove from dashboard subscriptions
        if client_id in self.dashboard_subscriptions:
            self.dashboard_subscriptions.remove(client_id)
        
        logger.info(f"Client {client_id} disconnected")

    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)

    async def send_json_message(self, data: Dict[str, Any], client_id: str):
        """Send JSON message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(data)
            except Exception as e:
                logger.error(f"Error sending JSON to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast_to_scan_subscribers(self, scan_id: str, data: Dict[str, Any]):
        """Broadcast message to all clients subscribed to a specific scan"""
        if scan_id in self.scan_subscriptions:
            disconnected_clients = []
            for client_id in self.scan_subscriptions[scan_id]:
                try:
                    await self.send_json_message(data, client_id)
                except:
                    disconnected_clients.append(client_id)
            
            # Clean up disconnected clients
            for client_id in disconnected_clients:
                self.disconnect(client_id)

    async def broadcast_to_dashboard(self, data: Dict[str, Any]):
        """Broadcast message to all dashboard subscribers"""
        disconnected_clients = []
        for client_id in self.dashboard_subscriptions.copy():
            try:
                await self.send_json_message(data, client_id)
            except:
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    def subscribe_to_scan(self, client_id: str, scan_id: str):
        """Subscribe client to scan updates"""
        if scan_id not in self.scan_subscriptions:
            self.scan_subscriptions[scan_id] = []
        
        if client_id not in self.scan_subscriptions[scan_id]:
            self.scan_subscriptions[scan_id].append(client_id)
        
        logger.info(f"Client {client_id} subscribed to scan {scan_id}")

    def subscribe_to_dashboard(self, client_id: str):
        """Subscribe client to dashboard updates"""
        if client_id not in self.dashboard_subscriptions:
            self.dashboard_subscriptions.append(client_id)
        
        logger.info(f"Client {client_id} subscribed to dashboard updates")

    async def send_scan_progress(self, scan_id: str, progress: int, step: str, subdomains_found: int = 0):
        """Send scan progress update"""
        data = {
            "type": "scan_progress",
            "scan_id": scan_id,
            "progress": progress,
            "step": step,
            "subdomains_found": subdomains_found,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_scan_subscribers(scan_id, data)

    async def send_subdomain_discovered(self, scan_id: str, subdomain: str, source: str):
        """Send new subdomain discovery notification"""
        data = {
            "type": "subdomain_discovered",
            "scan_id": scan_id,
            "subdomain": subdomain,
            "source": source,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_scan_subscribers(scan_id, data)

    async def send_scan_completed(self, scan_id: str, total_subdomains: int, scan_data: Dict[str, Any]):
        """Send scan completion notification"""
        data = {
            "type": "scan_completed",
            "scan_id": scan_id,
            "total_subdomains": total_subdomains,
            "summary": {
                "passive_count": scan_data.get('passive_count', 0),
                "active_count": scan_data.get('active_count', 0),
                "modern_count": scan_data.get('modern_count', 0),
                "vulnerable_count": len([s for s in scan_data.get('takeover_vulnerable', {}).values() if s])
            },
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_scan_subscribers(scan_id, data)
        # Also broadcast to dashboard for stats update
        await self.broadcast_to_dashboard({
            "type": "dashboard_update",
            "event": "scan_completed",
            "scan_id": scan_id,
            "timestamp": datetime.now().isoformat()
        })

    async def send_scan_error(self, scan_id: str, error: str):
        """Send scan error notification"""
        data = {
            "type": "scan_error",
            "scan_id": scan_id,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_scan_subscribers(scan_id, data)

# Global WebSocket manager instance
manager = ConnectionManager()