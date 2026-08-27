import type { Node, Edge } from "@xyflow/react";

export const purchaseApprovalNodes: Node[] = [
  { id: "1", type: "source", position: { x: 0, y: 0 }, data: { label: "INPUT SOURCE", title: "Purchase request form", description: "Submitted by: Requester role" } },
  { id: "2", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Department manager", description: "Can approve or reject" } },
  { id: "3", type: "decision", position: { x: 0, y: 0 }, data: { label: "ROUTING CONDITION", title: "Amount above AED 5,000?", description: "Yes → Finance · No → Complete" } },
  { id: "4", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Finance approver", description: "Can approve, reject, return" } },
  { id: "5", type: "output", position: { x: 0, y: 0 }, data: { label: "WORKFLOW STATUS", title: "Approved", description: "Lock final form values" } },
  { id: "6", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Save attachments", description: "Client-selected folder" } },
  { id: "7", type: "output", position: { x: 0, y: 0 }, data: { label: "FINAL OUTPUT", title: "Generate close PDF", description: "Save PDF and approval history" } },
];

export const purchaseApprovalEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e2-3", source: "2", target: "3", animated: true },
  { id: "e3-4", source: "3", sourceHandle: "yes", target: "4", animated: true, label: "YES" },
  { id: "e3-5", source: "3", sourceHandle: "no", target: "5", animated: true, label: "NO" },
  { id: "e4-6", source: "4", target: "6", animated: true },
  { id: "e5-6", source: "5", target: "6", animated: true },
  { id: "e6-7", source: "6", target: "7", animated: true },
];

export const inventoryPurchaseNodes: Node[] = [
  { id: "1", type: "source", position: { x: 0, y: 0 }, data: { label: "INPUT SOURCE", title: "Purchase Request", description: "Triggered via Form submission" } },
  { id: "2", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Create Row", description: "Purchase_Requests sheet" } },
  { id: "3", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Lookup Row", description: "Inventory sheet" } },
  { id: "4", type: "decision", position: { x: 0, y: 0 }, data: { label: "ROUTING CONDITION", title: "Stock Available?", description: "Yes → Deduct · No → Proceed to buy" } },
  
  // YES Branch
  { id: "5a", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Update Stock", description: "Deduct required amount" } },
  
  // NO Branch
  { id: "5b", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Manager", description: "Approve purchase" } },
  { id: "6", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Find Supplier", description: "Lookup from Suppliers sheet" } },
  { id: "7", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Create Folder", description: "For supplier docs" } },
  { id: "8", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Save Quotation", description: "From attachments" } },
  { id: "9", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Create PO Record", description: "Purchase_Orders sheet" } },
  { id: "10", type: "output", position: { x: 0, y: 0 }, data: { label: "FINAL OUTPUT", title: "Generate PO PDF", description: "Document Generation" } },
  { id: "11", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Save PO", description: "To supplier folder" } },
  { id: "12", type: "action", position: { x: 0, y: 0 }, data: { label: "STAFF ACTION", title: "Goods Received", description: "Secondary form completion" } },
  { id: "13", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Update Inventory", description: "Add received items" } },
  { id: "14", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Upload Invoice", description: "Supplier invoice" } },
  { id: "15", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Create Invoice", description: "Invoices sheet" } },
  { id: "16", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Payment Approval", description: "Finance review" } },
  { id: "17", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE SHEETS", title: "Create Expense", description: "Expenses sheet" } },
  { id: "18", type: "output", position: { x: 0, y: 0 }, data: { label: "FINAL OUTPUT", title: "Final Purchase PDF", description: "Closeout document" } },
  { id: "19", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Archive Purchase", description: "Final save" } },
];

export const inventoryPurchaseEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e2-3", source: "2", target: "3", animated: true },
  { id: "e3-4", source: "3", target: "4", animated: true },
  
  // YES Path
  { id: "e4-5a", source: "4", sourceHandle: "yes", target: "5a", animated: true, label: "YES" },
  
  // NO Path
  { id: "e4-5b", source: "4", sourceHandle: "no", target: "5b", animated: true, label: "NO" },
  { id: "e5b-6", source: "5b", target: "6", animated: true },
  { id: "e6-7", source: "6", target: "7", animated: true },
  { id: "e7-8", source: "7", target: "8", animated: true },
  { id: "e8-9", source: "8", target: "9", animated: true },
  { id: "e9-10", source: "9", target: "10", animated: true },
  { id: "e10-11", source: "10", target: "11", animated: true },
  { id: "e11-12", source: "11", target: "12", animated: true },
  { id: "e12-13", source: "12", target: "13", animated: true },
  { id: "e13-14", source: "13", target: "14", animated: true },
  { id: "e14-15", source: "14", target: "15", animated: true },
  { id: "e15-16", source: "15", target: "16", animated: true },
  { id: "e16-17", source: "16", target: "17", animated: true },
  { id: "e17-18", source: "17", target: "18", animated: true },
  { id: "e18-19", source: "18", target: "19", animated: true },
];
