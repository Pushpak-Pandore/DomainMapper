import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Target,
  Activity,
  Clock,
  Users,
  TrendingUp,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  PlayCircle,
  Square,
  BarChart3
} from 'lucide-react';
import { apiService } from '../services/api';

const Dashboard = () => {
  const [newJobDomain, setNewJobDomain] = useState('');
  const [selectedMethods, setSelectedMethods] = useState(['dns_bruteforce', 'certificate_transparency']);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  
  const queryClient = useQueryClient();

  // Queries
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiService.getDashboardStats,
    refetchInterval: 5000
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiService.getJobs(),
    refetchInterval: 3000
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiService.getTrends(7),
    refetchInterval: 30000
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: apiService.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['dashboardStats']);
      setNewJobDomain('');
      apiService.trackEvent({
        event_type: 'job_created',
        session_id: sessionId,
        data: { domain: newJobDomain, methods: selectedMethods }
      });
    }
  });

  const cancelJobMutation = useMutation({
    mutationFn: apiService.cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['dashboardStats']);
    }
  });

  const handleCreateJob = (e) => {
    e.preventDefault();
    if (!newJobDomain.trim()) return;
    
    createJobMutation.mutate({
      target_domain: newJobDomain.trim(),
      enumeration_methods: selectedMethods,
      user_session_id: sessionId
    });
  };

  const handleCancelJob = (jobId) => {
    cancelJobMutation.mutate(jobId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <Square className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subdomain Enumeration Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and analyze subdomain discovery operations in real-time
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : dashboardStats?.total_jobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{dashboardStats?.jobs_today || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : dashboardStats?.active_jobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subdomains Found</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : dashboardStats?.total_subdomains || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{dashboardStats?.subdomains_today || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${dashboardStats?.success_rate_percentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {dashboardStats?.average_job_duration_minutes || 0}min
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="create">Create Job</TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enumeration Jobs</CardTitle>
                <CardDescription>
                  Monitor the status of your subdomain enumeration jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Subdomains</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs?.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">
                            {job.target_domain}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${getStatusColor(job.status)} text-white`}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(job.status)}
                                {job.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={job.progress_percentage} 
                                className="w-20" 
                              />
                              <span className="text-sm text-gray-500">
                                {Math.round(job.progress_percentage)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {job.total_subdomains_found}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(job.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {job.status === 'running' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelJob(job.id)}
                                disabled={cancelJobMutation.isPending}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: 45, fill: '#10B981' },
                          { name: 'Running', value: 12, fill: '#3B82F6' },
                          { name: 'Failed', value: 8, fill: '#EF4444' },
                          { name: 'Pending', value: 5, fill: '#F59E0B' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[1, 2, 3, 4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Job Duration</span>
                      <span className="text-sm text-gray-500">
                        {dashboardStats?.average_job_duration_minutes || 0} minutes
                      </span>
                    </div>
                    <Progress value={75} className="w-full" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Success Rate</span>
                      <span className="text-sm text-gray-500">
                        {dashboardStats?.success_rate_percentage || 0}%
                      </span>
                    </div>
                    <Progress value={dashboardStats?.success_rate_percentage || 0} className="w-full" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Unique Domains Scanned</span>
                      <span className="text-sm text-gray-500">
                        {dashboardStats?.unique_domains_scanned || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historical Trends (Last 7 Days)</CardTitle>
                <CardDescription>
                  Track your enumeration activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends?.jobs_per_day || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Jobs Started"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subdomains Discovery Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends?.subdomains_per_day || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" name="Subdomains Found" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Job Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Start New Enumeration</CardTitle>
                <CardDescription>
                  Launch a new subdomain discovery job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateJob} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Target Domain</Label>
                    <Input
                      id="domain"
                      type="text"
                      placeholder="example.com"
                      value={newJobDomain}
                      onChange={(e) => setNewJobDomain(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Enumeration Methods</Label>
                    <div className="flex flex-wrap gap-2">
                      {['dns_bruteforce', 'certificate_transparency', 'search_engines'].map((method) => (
                        <label key={method} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedMethods.includes(method)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMethods([...selectedMethods, method]);
                              } else {
                                setSelectedMethods(selectedMethods.filter(m => m !== method));
                              }
                            }}
                          />
                          <span className="text-sm capitalize">
                            {method.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createJobMutation.isPending || !newJobDomain.trim()}
                    className="w-full"
                  >
                    {createJobMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="w-4 h-4 mr-2" />
                    )}
                    Start Enumeration
                  </Button>
                </form>

                {createJobMutation.error && (
                  <Alert className="mt-4">
                    <AlertDescription>
                      Error: {createJobMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;