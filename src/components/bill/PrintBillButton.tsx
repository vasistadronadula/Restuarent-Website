'use client';

import React, { useState } from 'react';
import { FileText, Printer } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import PrintBillPortal, { type BillFormat } from './PrintBillPortal';
import type { Order } from '@/types';

interface Props extends Omit<ButtonProps, 'onClick'> {
  order: Order;
  invoiceNo?: string;
  label?: string;
  /**
   * `a4` for anything a customer keeps — it produces the full-page tax invoice
   * rather than a photograph of a till roll on an otherwise blank sheet.
   * `thermal` is for the counter.
   */
  format?: BillFormat;
}

import { flushSync } from 'react-dom';

/**
 * Prints (or saves as PDF) one of the two bill documents.
 *
 * The bill is mounted only for the duration of the print so the page isn't
 * carrying a hidden copy of every order in the list. `flushSync` guarantees
 * the portal mounts synchronously inside the click handler so mobile browsers
 * do not block the print dialog.
 */
export default function PrintBillButton({
  order,
  invoiceNo,
  format = 'thermal',
  label = 'Print 80mm Bill',
  variant = 'outline',
  size = 'sm',
  ...buttonProps
}: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    flushSync(() => {
      setPrinting(true);
    });

    window.print();
    setPrinting(false);
  };

  const Icon = Printer;

  return (
    <>
      {printing && (
        <PrintBillPortal
          order={order}
          invoiceNo={invoiceNo}
          format={format}
          copyLabel="CUSTOMER COPY"
        />
      )}
      <Button variant={variant} size={size} onClick={handlePrint} {...buttonProps}>
        <Icon />
        {label}
      </Button>
    </>
  );
}
