import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Shield, Activity, Users, Eye, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SecuritySummary {
  total_events: number
  failed_logins: number
  successful_logins: number
  suspicious_activities: number
  unique_users: number
  recent_events: any[]
}

interface SecurityThreat {
  user_id: string
  failed_attempts: number
  latest_attempt: string
}

export const SecurityDashboard = () => {
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null)
  const [threats, setThreats] = useState<SecurityThreat[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true)

      // Fetch security summary
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('security-monitor', {
        body: { action: 'get_security_summary' }
      })

      if (summaryError) throw summaryError
      setSecuritySummary(summaryData.data.summary)

      // Fetch threats
      const { data: threatsData, error: threatsError } = await supabase.functions.invoke('security-monitor', {
        body: { action: 'check_threats' }
      })

      if (threatsError) throw threatsError
      setThreats(threatsData.data.threats)

      // Fetch recent alerts
      const { data: alertsData, error: alertsError } = await supabase.functions.invoke('security-monitor', {
        body: { action: 'get_recent_alerts' }
      })

      if (alertsError) throw alertsError
      setAlerts(alertsData.data.alerts)

    } catch (error) {
      console.error('Error fetching security data:', error)
      toast.error('Failed to load security data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSecurityData, 300000)
    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="text-center py-8">Loading security data...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <Button
          onClick={fetchSecurityData}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events (24h)</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securitySummary?.total_events || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {securitySummary?.failed_logins || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Logins</CardTitle>
            <Shield className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {securitySummary?.successful_logins || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securitySummary?.unique_users || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Threats Alert */}
      {threats.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Security Alert:</strong> {threats.length} potential threat(s) detected. 
            Users with excessive failed login attempts require attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Suspicious Activities (24h)</span>
                  <Badge variant={securitySummary?.suspicious_activities ? 'destructive' : 'outline'}>
                    {securitySummary?.suspicious_activities || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Security Threats</span>
                  <Badge variant={threats.length > 0 ? 'destructive' : 'outline'}>
                    {threats.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Security Alerts</span>
                  <Badge variant={alerts.length > 0 ? 'secondary' : 'outline'}>
                    {alerts.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Threats</CardTitle>
            </CardHeader>
            <CardContent>
              {threats.length === 0 ? (
                <p className="text-muted-foreground">No security threats detected.</p>
              ) : (
                <div className="space-y-3">
                  {threats.map((threat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">User: {threat.user_id || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">
                          Last attempt: {new Date(threat.latest_attempt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {threat.failed_attempts} failed attempts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground">No security alerts.</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-medium">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              {!securitySummary?.recent_events || securitySummary.recent_events.length === 0 ? (
                <p className="text-muted-foreground">No recent events.</p>
              ) : (
                <div className="space-y-3">
                  {securitySummary.recent_events.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{event.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={event.success ? 'outline' : 'destructive'}>
                        {event.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}