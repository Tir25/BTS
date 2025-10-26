"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MonitoringService_1 = require("../services/MonitoringService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    try {
        const health = await MonitoringService_1.monitoringService.getSystemHealth();
        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get system health', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get system health',
            message: String(error)
        });
    }
});
router.get('/metrics', (req, res) => {
    try {
        const metrics = MonitoringService_1.monitoringService.getMetrics();
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get metrics', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics',
            message: String(error)
        });
    }
});
router.get('/metrics/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const metrics = MonitoringService_1.monitoringService.getMetricsHistory(limit);
        res.json({
            success: true,
            data: metrics,
            count: metrics.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get metrics history', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics history',
            message: String(error)
        });
    }
});
router.get('/alerts', (req, res) => {
    try {
        const alerts = MonitoringService_1.monitoringService.getActiveAlerts();
        res.json({
            success: true,
            data: alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get alerts', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get alerts',
            message: String(error)
        });
    }
});
router.get('/alerts/all', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const alerts = MonitoringService_1.monitoringService.getAllAlerts(limit);
        res.json({
            success: true,
            data: alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get all alerts', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get all alerts',
            message: String(error)
        });
    }
});
router.get('/alerts/rules', (req, res) => {
    try {
        const rules = MonitoringService_1.monitoringService.getAlertRules();
        res.json({
            success: true,
            data: rules,
            count: rules.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get alert rules', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get alert rules',
            message: String(error)
        });
    }
});
router.post('/alerts/rules', (req, res) => {
    try {
        const { name, category, metric, operator, threshold, severity, enabled, cooldown } = req.body;
        if (!name || !category || !metric || !operator || !threshold || !severity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Name, category, metric, operator, threshold, and severity are required'
            });
        }
        const ruleId = MonitoringService_1.monitoringService.addAlertRule({
            name,
            category,
            metric,
            operator,
            threshold,
            severity,
            enabled: enabled !== false,
            cooldown: cooldown || 300
        });
        res.status(201).json({
            success: true,
            data: { id: ruleId },
            message: 'Alert rule created successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to add alert rule', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to add alert rule',
            message: String(error)
        });
    }
});
router.put('/alerts/rules/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const success = MonitoringService_1.monitoringService.updateAlertRule(id, updates);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Alert rule not found',
                message: `No alert rule found with id: ${id}`
            });
        }
        res.json({
            success: true,
            message: 'Alert rule updated successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update alert rule', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to update alert rule',
            message: String(error)
        });
    }
});
router.delete('/alerts/rules/:id', (req, res) => {
    try {
        const { id } = req.params;
        const success = MonitoringService_1.monitoringService.deleteAlertRule(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Alert rule not found',
                message: `No alert rule found with id: ${id}`
            });
        }
        res.json({
            success: true,
            message: 'Alert rule deleted successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete alert rule', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to delete alert rule',
            message: String(error)
        });
    }
});
router.post('/alerts/:id/resolve', (req, res) => {
    try {
        const { id } = req.params;
        const success = MonitoringService_1.monitoringService.resolveAlert(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found or already resolved',
                message: `No unresolved alert found with id: ${id}`
            });
        }
        res.json({
            success: true,
            message: 'Alert resolved successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to resolve alert', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to resolve alert',
            message: String(error)
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const health = await MonitoringService_1.monitoringService.getSystemHealth();
        const metrics = MonitoringService_1.monitoringService.getMetrics();
        const alerts = MonitoringService_1.monitoringService.getActiveAlerts();
        const rules = MonitoringService_1.monitoringService.getAlertRules();
        const dashboard = {
            health,
            metrics,
            alerts: {
                active: alerts.length,
                critical: alerts.filter(a => a.type === 'critical').length,
                warning: alerts.filter(a => a.type === 'warning').length,
                info: alerts.filter(a => a.type === 'info').length
            },
            rules: {
                total: rules.length,
                enabled: rules.filter(r => r.enabled).length,
                disabled: rules.filter(r => !r.enabled).length
            },
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            data: dashboard
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get dashboard data', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get dashboard data',
            message: String(error)
        });
    }
});
router.get('/performance', async (req, res) => {
    try {
        const metrics = MonitoringService_1.monitoringService.getMetrics();
        const health = await MonitoringService_1.monitoringService.getSystemHealth();
        if (!metrics) {
            return res.status(503).json({
                success: false,
                error: 'No metrics available',
                message: 'System metrics not yet collected'
            });
        }
        const performance = {
            system: {
                uptime: health.uptime,
                memory: {
                    used: Math.round(metrics.memory.heapUsed / 1024 / 1024),
                    total: Math.round(metrics.memory.heapTotal / 1024 / 1024),
                    utilization: Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
                },
                cpu: {
                    usage: metrics.cpu.usage,
                    user: metrics.cpu.user,
                    system: metrics.cpu.system
                },
                eventLoop: {
                    lag: metrics.eventLoop.lag,
                    utilization: metrics.eventLoop.utilization
                }
            },
            services: health.services,
            performance: metrics.performance,
            alerts: health.alerts,
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            data: performance
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get performance data', 'monitoring', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get performance data',
            message: String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.js.map