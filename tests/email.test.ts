// @vitest-environment node

import nodemailer from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoEmailSender } from '@/actions/emails/email';

vi.mock('nodemailer', () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-id' });
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: sendMailMock,
      })),
    },
  };
});

describe('autoEmailSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BREVO_SMTP_USER = 'test-user';
    process.env.BREVO_SMTP_KEY = 'test-key';
  });

  it('sends email with correct recipient, subject, text, and sender', async () => {
    await autoEmailSender(
      'Hello world',
      'Test Subject',
      'applicant@example.com',
    );

    const mockedCreateTransport = vi.mocked(nodemailer.createTransport);
    expect(mockedCreateTransport).toHaveBeenCalledWith({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test-user',
        pass: 'test-key',
      },
    });

    const transporter = mockedCreateTransport.mock.results[0].value;
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: {
        name: 'Adopt an Inmate Team',
        address: 'adopt@adoptaninmate.org',
      },
      to: 'applicant@example.com',
      subject: 'Test Subject',
      text: 'Hello world',
    });
  });

  it('includes bcc when provided', async () => {
    await autoEmailSender(
      'Action required',
      'Your match has been approved',
      'adopter@example.com',
      'matchwatchers@adoptaninmate.org',
    );

    const mockedCreateTransport = vi.mocked(nodemailer.createTransport);
    const transporter = mockedCreateTransport.mock.results[0].value;

    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: {
        name: 'Adopt an Inmate Team',
        address: 'adopt@adoptaninmate.org',
      },
      to: 'adopter@example.com',
      bcc: 'matchwatchers@adoptaninmate.org',
      subject: 'Your match has been approved',
      text: 'Action required',
    });
  });
});
