
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "@/types";
import logger from "@/lib/logger";

// Hook para buscar todos os clientes
export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching customers:", error);
        throw error;
      }

      return data as Customer[];
    },
  });
};

// Hook para buscar um cliente específico
export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        logger.error("Error fetching customer:", error);
        throw error;
      }

      return data as Customer;
    },
    enabled: !!id,
  });
};

// Hook para criar um novo cliente
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: Omit<Customer, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customerData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating customer:", error);
        throw error;
      }

      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

// Hook para atualizar um cliente
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating customer:", error);
        throw error;
      }

      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", data.id] });
    },
  });
};

// Hook para deletar um cliente
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting customer:", error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
