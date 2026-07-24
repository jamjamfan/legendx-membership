interface CreateZoomMeetingInput {
  topic: string;
  startTime: string;
  durationMinutes: number;
  timezone?: string;
}

async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`zoom_token_failed:${response.status}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function createZoomMeeting(input: CreateZoomMeetingInput) {
  const accessToken = await getZoomAccessToken();
  if (!accessToken) {
    return { created: false, reason: "not_configured" as const };
  }

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: input.topic,
      type: 2,
      start_time: input.startTime,
      duration: input.durationMinutes,
      timezone: input.timezone ?? "Asia/Hong_Kong",
      settings: {
        waiting_room: true,
        join_before_host: false,
        mute_upon_entry: true,
        approval_type: 0,
      },
    }),
  });

  if (!response.ok) {
    return {
      created: false,
      reason: "provider_error" as const,
      status: response.status,
    };
  }

  const payload = (await response.json()) as {
    id: number;
    join_url: string;
    start_url: string;
  };
  return {
    created: true,
    meetingId: String(payload.id),
    joinUrl: payload.join_url,
  };
}
