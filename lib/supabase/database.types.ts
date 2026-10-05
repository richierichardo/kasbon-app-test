export type DebtType = "owed_to_me" | "i_owe";

export type Database = {
  public: {
    Tables: {
      debts: {
        Row: {
          id: string;
          user_id: string;
          type: DebtType;
          counterpart_name: string;
          amount: string;
          amount_text: string;
          note: string | null;
          due_date: string | null;
          settled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: DebtType;
          counterpart_name: string;
          amount: string;
          amount_text?: never;
          note?: string | null;
          due_date?: string | null;
          settled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: DebtType;
          counterpart_name?: string;
          amount?: string;
          amount_text?: never;
          note?: string | null;
          due_date?: string | null;
          settled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      debt_type: DebtType;
    };
    CompositeTypes: Record<string, never>;
  };
};
