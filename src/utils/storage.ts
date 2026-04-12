import { Invoice } from '../types';
import { supabase, getCurrentUserId } from './supabaseClient';
import { roundToTwo } from './currency';

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch invoices');
    }

    return (data || []).map(item => ({
      id: item.id,
      invoiceNumber: item.invoice_number,
      customer: item.customer,
      items: item.items,
      subtotal: roundToTwo(parseFloat(item.subtotal || '0')),
      discount: roundToTwo(parseFloat(item.discount || '0')),
      shippingFee: roundToTwo(parseFloat(item.shipping_fee || '0')),
      total: roundToTwo(parseFloat(item.total || '0')),
      pendingAmount: roundToTwo(parseFloat(item.pending_amount || '0')),
      advancePayment: roundToTwo(parseFloat(item.advance_payment || '0')),
      date: item.date,
      user_id: item.user_id,
    }));
  } catch (error) {
    console.error('Error in getInvoices:', error);
    throw error;
  }
};

export const saveInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    console.log('Attempting to save invoice:', invoice.invoiceNumber);
    
    const { error } = await supabase
      .from('invoices')
      .insert([{
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        customer: invoice.customer,
        items: invoice.items,
        subtotal: roundToTwo(invoice.subtotal),
        discount: roundToTwo(invoice.discount),
        shipping_fee: roundToTwo(invoice.shippingFee),
        total: roundToTwo(invoice.total),
        pending_amount: roundToTwo(invoice.pendingAmount),
        advance_payment: roundToTwo(invoice.advancePayment),
        date: invoice.date,
      }]);

    if (error) {
      console.error('Supabase error details:', error);
      console.error('Error saving invoice:', error);
      throw new Error('Failed to save invoice');
    }
    console.log('Invoice saved successfully');
  } catch (error) {
    console.error('Error in saveInvoice:', error);
    throw error;
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  try {
    console.log('Getting next invoice number...');
    
    // Get the highest existing invoice number and increment
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      console.error('Error fetching latest invoice:', fetchError);
      // Ultimate fallback
      return `INV-${Date.now().toString().slice(-4)}`;
    }

    if (invoices && invoices.length > 0) {
      const lastInvoiceNumber = invoices[0].invoice_number;
      console.log('Last invoice number:', lastInvoiceNumber);
      const numberPart = parseInt(lastInvoiceNumber.split('-')[1]) || 1000;
      const nextNumber = `INV-${(numberPart + 1).toString().padStart(4, '0')}`;
      console.log('Next invoice number:', nextNumber);
      return nextNumber;
    }

    console.log('No existing invoices, starting with INV-1001');
    return 'INV-1001';
  } catch (error) {
    console.error('Error in getNextInvoiceNumber:', error);
    // Fallback to timestamp-based number
    return `INV-${Date.now().toString().slice(-4)}`;
  }
};

export const getInvoiceByNumber = async (invoiceNumber: string): Promise<Invoice | undefined> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invoice by number:', error);
      throw new Error('Failed to fetch invoice');
    }

    if (!data) return undefined;

    // Convert database format back to Invoice interface
    return {
      id: data.id,
      invoiceNumber: data.invoice_number,
      customer: data.customer,
      items: data.items,
      subtotal: roundToTwo(parseFloat(data.subtotal || '0')),
      discount: roundToTwo(parseFloat(data.discount || '0')),
      shippingFee: roundToTwo(parseFloat(data.shipping_fee || '0')),
      total: roundToTwo(parseFloat(data.total || '0')),
      pendingAmount: roundToTwo(parseFloat(data.pending_amount || '0')),
      advancePayment: roundToTwo(parseFloat(data.advance_payment || '0')),
      date: data.date,
      user_id: data.user_id,
    };
  } catch (error) {
    console.error('Error in getInvoiceByNumber:', error);
    throw error;
  }
};

export const updateInvoice = async (updatedInvoice: Invoice): Promise<void> => {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Prepare the update payload
    const updatePayload: any = {
      customer: updatedInvoice.customer,
      items: updatedInvoice.items,
      subtotal: roundToTwo(updatedInvoice.subtotal),
      discount: roundToTwo(updatedInvoice.discount),
      shipping_fee: roundToTwo(updatedInvoice.shippingFee),
      total: roundToTwo(updatedInvoice.total),
      pending_amount: roundToTwo(updatedInvoice.pendingAmount),
      advance_payment: roundToTwo(updatedInvoice.advancePayment),
      date: updatedInvoice.date,
      updated_at: new Date().toISOString(),
    };
    
    // If the invoice has no user_id (was created anonymously) and we have a current user,
    // assign the invoice to the current user
    if (!updatedInvoice.user_id && currentUserId) {
      updatePayload.user_id = currentUserId;
    } else if (updatedInvoice.user_id) {
      // Maintain existing user_id
      updatePayload.user_id = updatedInvoice.user_id;
    }
    
    const { error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', updatedInvoice.id);

    if (error) {
      console.error('Error updating invoice:', error);
      throw new Error('Failed to update invoice');
    }
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    throw error;
  }
};

// Migration function to move localStorage data to Supabase (run once)
export const migrateLocalStorageToSupabase = async (): Promise<void> => {
  try {
    const INVOICES_KEY = 'sales_invoices';
    const stored = localStorage.getItem(INVOICES_KEY);
    
    if (!stored) {
      console.log('No localStorage data to migrate');
      return;
    }

    const localInvoices: Invoice[] = JSON.parse(stored);
    
    if (localInvoices.length === 0) {
      console.log('No invoices to migrate');
      return;
    }

    console.log(`Migrating ${localInvoices.length} invoices to Supabase...`);

    // Insert all invoices
    for (const invoice of localInvoices) {
      await saveInvoice(invoice);
    }

    console.log('Migration completed successfully');
    
    // Optionally clear localStorage after successful migration
    // localStorage.removeItem(INVOICES_KEY);
    // localStorage.removeItem('invoice_counter');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};