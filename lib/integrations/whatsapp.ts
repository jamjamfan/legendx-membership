export interface SendWhatsappTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: readonly string[];
}

export async function sendWhatsappTemplate(
  input: SendWhatsappTemplateInput,
) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.META_GRAPH_API_VERSION ?? "v23.0";

  if (!accessToken || !phoneNumberId) {
    return { delivered: false, reason: "not_configured" as const };
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode ?? "zh_HK" },
          components:
            input.bodyParameters && input.bodyParameters.length > 0
              ? [
                  {
                    type: "body",
                    parameters: input.bodyParameters.map((text) => ({
                      type: "text",
                      text,
                    })),
                  },
                ]
              : undefined,
        },
      }),
    },
  );

  if (!response.ok) {
    return {
      delivered: false,
      reason: "provider_error" as const,
      status: response.status,
    };
  }

  const payload = (await response.json()) as {
    messages?: Array<{ id: string }>;
  };
  return {
    delivered: true,
    providerId: payload.messages?.[0]?.id ?? null,
  };
}
