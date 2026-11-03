// PDF оферта за клиента. Вика се само на сървъра.
// Използва @react-pdf/renderer: пишем "компоненти" като в React,
// но вместо HTML се получава PDF файл.
//
// Важно (капан на react-pdf): lineHeight се задава САМО заедно с fontSize
// в един и същ стил. Ако се зададе на цялата страница, редовете се наслагват.

import path from "node:path";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { COMPANY } from "../company";
import { formatArea, formatEuro, formatRange, onRequestReasonText } from "../format";
import type { OfferResult, QuoteOffer } from "../types";

// ---------- Шрифтове ----------
// Вградените PDF шрифтове нямат кирилица, затова ползваме PT Sans (лиценз OFL).
// Пътят е спрямо папката на проекта (process.cwd()).

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FAMILY = "PT Sans";

// Капан: ако един и същ зареден шрифт се ползва за два различни PDF-а,
// вторият излиза с грешна "таблица на буквите" и при копиране на текст
// (например номера на офертата) се получават грешни символи. Видимо всичко е наред.
// Затова преди всеки PDF изчистваме шрифтовете и ги регистрираме наново.
// (Font.reset() не върши работа: не кара шрифта да се зареди отново.)
function registerFonts() {
  Font.clear();
  // clear() маха и вградения Helvetica, а react-pdf винаги го търси като резервен шрифт.
  Font.register({
    family: "Helvetica",
    fonts: [
      { src: "Helvetica", fontWeight: 400 },
      { src: "Helvetica-Bold", fontWeight: 700 },
    ],
  });
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(FONT_DIR, "PTSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "PTSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // react-pdf пренася думите по английските правила и къса кирилицата грешно.
  // Затова изключваме сричкопренасянето: думите се пренасят цели.
  Font.registerHyphenationCallback((word) => [word]);
}

// ---------- Стилове ----------

const color = {
  ink: "#12301e",
  lawn: "#2f6e40",
  meadow: "#edf2e8",
  line: "#c3cfb8",
  muted: "#475c4d",
  dandelion: "#e9b82d",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    // Без лигатури: иначе "fi" става един знак и при копиране "office@" излиза "offce@".
    fontFeatureSettings: { liga: false },
    color: color.ink,
    paddingTop: 0,
    paddingBottom: 64,
    paddingHorizontal: 0,
  },

  header: {
    backgroundColor: color.lawn,
    color: color.white,
    paddingVertical: 20,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 22, lineHeight: 1.2, fontWeight: 700 },
  tagline: { fontSize: 10, lineHeight: 1.4, marginTop: 2 },
  docTitle: { fontSize: 10, lineHeight: 1.4, textAlign: "right" },
  docNumber: { fontSize: 13, lineHeight: 1.3, fontWeight: 700, textAlign: "right" },

  body: { paddingHorizontal: 40, paddingTop: 18 },

  metaRow: { flexDirection: "row", marginBottom: 14 },
  metaItem: { marginRight: 32 },
  metaLabel: { fontSize: 8, lineHeight: 1.4, color: color.muted, textTransform: "uppercase" },
  value: { fontSize: 10.5, lineHeight: 1.4 },
  valueBold: { fontSize: 10.5, lineHeight: 1.4, fontWeight: 700 },

  columns: { flexDirection: "row", marginBottom: 18 },
  column: {
    flex: 1,
    backgroundColor: color.meadow,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  columnGap: { width: 12 },
  columnTitle: { fontSize: 11, lineHeight: 1.3, fontWeight: 700, marginBottom: 4 },
  // Етикет и стойност на един ред: "Площ   450 м²"
  field: { flexDirection: "row", marginBottom: 2 },
  fieldLabel: { width: 56, paddingTop: 1, fontSize: 9, lineHeight: 1.55, color: color.muted },
  fieldValue: { flex: 1 },

  sectionTitle: { fontSize: 12, lineHeight: 1.3, fontWeight: 700, marginBottom: 6 },

  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: color.ink,
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: color.line,
    paddingVertical: 5,
  },
  colItem: { flex: 1, paddingRight: 12 },
  colAmount: { width: 90, textAlign: "right" },
  th: { fontSize: 8, lineHeight: 1.4, color: color.muted, textTransform: "uppercase" },
  cell: { fontSize: 10.5, lineHeight: 1.4 },
  cellNote: { fontSize: 8.5, lineHeight: 1.4, color: color.muted },
  cellAmount: { fontSize: 10.5, lineHeight: 1.4, textAlign: "right" },

  totalBox: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: color.dandelion,
    backgroundColor: color.meadow,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  totalLabel: { fontSize: 11, lineHeight: 1.3, fontWeight: 700 },
  totalHint: { fontSize: 9, lineHeight: 1.4, color: color.muted, marginTop: 2 },
  totalValue: { fontSize: 20, lineHeight: 1.2, fontWeight: 700 },

  message: { marginTop: 16 },
  messageText: { fontSize: 10, lineHeight: 1.5 },

  notes: { marginTop: 16 },
  note: { fontSize: 9, lineHeight: 1.45, color: color.muted, marginBottom: 2 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: color.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, lineHeight: 1.4, color: color.muted },
});

// ---------- Малки помощни компоненти ----------

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={[bold ? s.valueBold : s.value, s.fieldValue]}>{value}</Text>
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaItem}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function PriceTable({ result }: { result: Extract<OfferResult, { status: "ok" }> }) {
  return (
    <View>
      <Text style={s.sectionTitle}>Изчисление</Text>
      <View style={s.tableHead}>
        <Text style={[s.th, s.colItem]}>Позиция</Text>
        <Text style={[s.th, s.colAmount]}>Сума</Text>
      </View>
      {result.lines.map((line) => (
        // wrap={false}: редът не се разделя между две страници
        <View key={line.key} style={s.tableRow} wrap={false}>
          <View style={s.colItem}>
            <Text style={s.cell}>{line.label}</Text>
            {line.note && <Text style={s.cellNote}>{line.note}</Text>}
          </View>
          <Text style={[s.cellAmount, s.colAmount]}>
            {formatEuro(line.amountCents)}
          </Text>
        </View>
      ))}

      <View style={s.totalBox} wrap={false}>
        <View>
          <Text style={s.totalLabel}>Ориентировъчна сума</Text>
          <Text style={s.totalHint}>
            Очакван диапазон: {formatRange(result.minCents, result.maxCents)}
          </Text>
        </View>
        <Text style={s.totalValue}>{formatEuro(result.totalCents)}</Text>
      </View>
    </View>
  );
}

function OnRequestBox({ result }: { result: Extract<OfferResult, { status: "on_request" }> }) {
  return (
    <View style={s.totalBox} wrap={false}>
      <View>
        <Text style={s.totalLabel}>Цена по договаряне</Text>
        <Text style={s.totalHint}>
          {onRequestReasonText(result.reason)} Ще се свържем с вас с конкретно предложение.
        </Text>
      </View>
    </View>
  );
}

// ---------- Документът ----------

function QuoteDocument({ data }: { data: QuoteOffer }) {
  const { result, customer } = data;
  const sel = result.selection;

  return (
    <Document
      title={`Оферта ${data.quoteNumber}`}
      author={COMPANY.name}
      subject="Ориентировъчна оферта"
      language="bg"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{COMPANY.name}</Text>
            <Text style={s.tagline}>{COMPANY.tagline}</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Ориентировъчна оферта</Text>
            <Text style={s.docNumber}>№ {data.quoteNumber}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.metaRow}>
            <MetaItem label="Дата" value={data.issuedOn} />
            <MetaItem label="Валидна до" value={data.validUntil} />
          </View>

          <View style={s.columns}>
            <View style={s.column}>
              <Text style={s.columnTitle}>Клиент</Text>
              <Field label="Име" value={customer.name} bold />
              <Field label="Телефон" value={customer.phone} />
              <Field label="Имейл" value={customer.email} />
            </View>
            <View style={s.columnGap} />
            <View style={s.column}>
              <Text style={s.columnTitle}>Обект</Text>
              <Field label="Услуга" value={sel.serviceName} bold />
              <Field label="Площ" value={formatArea(sel.areaSqm)} />
              <Field label="Район" value={sel.zoneName} />
              {sel.frequencyName && <Field label="Честота" value={sel.frequencyName} />}
              {result.status === "on_request" && sel.extraNames.length > 0 && (
                <Field label="Добавки" value={sel.extraNames.join(", ")} />
              )}
            </View>
          </View>

          {result.status === "ok" ? (
            <PriceTable result={result} />
          ) : (
            <OnRequestBox result={result} />
          )}

          {customer.message && (
            <View style={s.message}>
              <Text style={s.sectionTitle}>Вашето съобщение</Text>
              <Text style={s.messageText}>{customer.message}</Text>
            </View>
          )}

          <View style={s.notes} wrap={false}>
            <Text style={s.note}>
              {result.status === "ok"
                ? "Цената е ориентировъчна и е изчислена по въведените от вас данни. Точната сума уточняваме след оглед на място."
                : "Точната цена уточняваме след разговор и оглед на място."}
            </Text>
            <Text style={s.note}>
              Офертата е валидна до {data.validUntil}. Цените са в евро.
            </Text>
            <Text style={s.note}>
              За въпроси: {COMPANY.phone} или {COMPANY.email}. Посочете номер {data.quoteNumber}.
            </Text>
            <Text style={s.note}>
              Демонстрационен проект. Фирмата, цените и контактите са измислени.
            </Text>
          </View>
        </View>

        {/* fixed: долният колонтитул се повтаря на всяка страница.
            Без номер на страница (render={...}): с нашия шрифт react-pdf
            тогава скрива целия колонтитул. Офертата е една страница. */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {COMPANY.name} · {COMPANY.city} · {COMPANY.phone}
          </Text>
          <Text style={s.footerText}>
            {COMPANY.email} · {COMPANY.website}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Опашка: PDF-ите се правят един след друг. Иначе едно запитване може да изчисти
// шрифтовете (registerFonts), докато друго още рисува своя PDF.
let queue: Promise<unknown> = Promise.resolve();

/** Генерира PDF офертата и връща файла като Buffer (готов за прикачване към имейл). */
export function generateQuotePdf(data: QuoteOffer): Promise<Buffer> {
  const job = queue.then(() => {
    registerFonts();
    return renderToBuffer(<QuoteDocument data={data} />);
  });
  // Следващият чака този да свърши, дори ако този е завършил с грешка.
  queue = job.catch(() => undefined);
  return job;
}
