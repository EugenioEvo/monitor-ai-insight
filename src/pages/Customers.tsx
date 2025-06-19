
import { useState } from "react";
import { Plus, Search, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { useCustomers } from "@/hooks/useCustomers";
import { useNavigate } from "react-router-dom";
import type { Customer } from "@/types";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();
  
  const { data: customers = [], isLoading } = useCustomers();

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document.includes(searchTerm)
  );

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleViewDashboard = (customer: Customer) => {
    navigate(`/customers/${customer.id}/dashboard`);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  if (showForm) {
    return (
      <CustomerForm
        customer={editingCustomer}
        onClose={handleCloseForm}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes
          </p>
        </div>
        <Button onClick={handleNewCustomer} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Clientes</span>
            <div className="relative w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerList
            customers={filteredCustomers}
            isLoading={isLoading}
            onEditCustomer={handleEditCustomer}
            onViewDashboard={handleViewDashboard}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
