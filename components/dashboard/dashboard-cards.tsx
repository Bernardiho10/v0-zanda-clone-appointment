"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, MoreHorizontal } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"
import { cn } from "@/lib/utils"
import type { DashboardData } from "@/lib/dashboard-analytics"

interface DashboardCardsProps {
  data: DashboardData
  className?: string
}

const chartConfig = {
  invoiced: {
    label: "Invoiced",
    color: "hsl(var(--chart-1))",
  },
  futureInvoices: {
    label: "Future Invoices",
    color: "hsl(var(--chart-2))",
  },
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-1))",
  },
  arrived: {
    label: "Arrived",
    color: "hsl(var(--chart-2))",
  },
  confirmed: {
    label: "Confirmed",
    color: "hsl(var(--chart-3))",
  },
  pending: {
    label: "Pending",
    color: "hsl(var(--chart-4))",
  },
  rescheduled: {
    label: "Rescheduled",
    color: "hsl(var(--chart-5))",
  },
  newClients: {
    label: "New Clients",
    color: "hsl(var(--primary))",
  },
}

const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

export function DashboardCards({ data, className }: DashboardCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(2)}%`
  }

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-red-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-green-500" />
    )
  }

  // Prepare chart data
  const incomeChartData = data.appointments.statusBreakdown.slice(-7).map((item) => ({
    date: item.date,
    invoiced: Math.floor(Math.random() * 50000) + 10000,
    futureInvoices: Math.floor(Math.random() * 30000) + 5000,
  }))

  const clinicalNotesData = [
    { name: "No Note", value: data.appointments.clinicalNotes.noNote, color: pieColors[0] },
    { name: "Draft", value: data.appointments.clinicalNotes.draft, color: pieColors[1] },
    { name: "Completed", value: data.appointments.clinicalNotes.completed, color: pieColors[2] },
  ]

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Income Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Income</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            More Detail
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Invoiced</p>
              <p className="text-2xl font-bold">{formatCurrency(data.income.invoiced)}</p>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(data.income.invoicedChange)}
                <span
                  className={cn("font-medium", data.income.invoicedChange >= 0 ? "text-red-500" : "text-green-500")}
                >
                  {formatPercentage(data.income.invoicedChange)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs. Previous Period</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Payments Received</p>
              <p className="text-2xl font-bold">{formatCurrency(data.income.paymentsReceived)}</p>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(data.income.paymentsChange)}
                <span
                  className={cn("font-medium", data.income.paymentsChange >= 0 ? "text-red-500" : "text-green-500")}
                >
                  {formatPercentage(data.income.paymentsChange)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs. Previous Period</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ChartContainer config={chartConfig}>
              <BarChart data={incomeChartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="invoiced" fill="var(--color-invoiced)" />
                <Bar dataKey="futureInvoices" fill="var(--color-futureInvoices)" />
              </BarChart>
            </ChartContainer>
          </div>

          <Button variant="link" className="text-primary p-0">
            Invoices & Payments Report
          </Button>
        </CardContent>
      </Card>

      {/* Appointments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Appointments</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            More Detail
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Attended</p>
              <p className="text-2xl font-bold">{data.appointments.totalAttended}</p>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(data.appointments.attendedChange)}
                <span
                  className={cn(
                    "font-medium",
                    data.appointments.attendedChange >= 0 ? "text-red-500" : "text-green-500",
                  )}
                >
                  {formatPercentage(data.appointments.attendedChange)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs. Previous Period</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Not Attended</p>
              <p className="text-2xl font-bold">{data.appointments.totalNotAttended}</p>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(data.appointments.notAttendedChange)}
                <span
                  className={cn(
                    "font-medium",
                    data.appointments.notAttendedChange >= 0 ? "text-red-500" : "text-green-500",
                  )}
                >
                  {formatPercentage(data.appointments.notAttendedChange)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs. Previous Period</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Clinical Notes</p>
              <div className="h-[80px]">
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Pie data={clinicalNotesData} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value">
                      {clinicalNotesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
              <p className="text-xs text-center font-medium">
                Total Notes:{" "}
                {data.appointments.clinicalNotes.noNote +
                  data.appointments.clinicalNotes.draft +
                  data.appointments.clinicalNotes.completed}
              </p>
            </div>
          </div>

          <div className="h-[200px]">
            <ChartContainer config={chartConfig}>
              <BarChart data={data.appointments.statusBreakdown.slice(-7)}>
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" />
                <Bar dataKey="arrived" stackId="a" fill="var(--color-arrived)" />
                <Bar dataKey="confirmed" stackId="a" fill="var(--color-confirmed)" />
                <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" />
                <Bar dataKey="rescheduled" stackId="a" fill="var(--color-rescheduled)" />
              </BarChart>
            </ChartContainer>
          </div>

          <Button variant="link" className="text-primary p-0">
            Appointment Report
          </Button>
        </CardContent>
      </Card>

      {/* New Clients Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>New Clients</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            More Detail
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{data.clients.totalNewClients}</p>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(data.clients.newClientsChange)}
                <span
                  className={cn("font-medium", data.clients.newClientsChange >= 0 ? "text-red-500" : "text-green-500")}
                >
                  {formatPercentage(data.clients.newClientsChange)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs. Previous Period</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Source</p>
              <p className="text-sm text-muted-foreground">No data available.</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ChartContainer config={chartConfig}>
              <BarChart data={data.clients.acquisitionTrend}>
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newClients" fill="var(--color-newClients)" />
              </BarChart>
            </ChartContainer>
          </div>

          <Button variant="link" className="text-primary p-0">
            New Client Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
