import {useEffect, useState} from 'preact/hooks';
import {useStore, updateSettings} from '../store';

export default function SettingsPage() {
  const {settings, status} = useStore();

  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // The store loads settings asynchronously, so mirror them once they arrive.
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const setField = (key, value) =>
    setDraft((prev) => ({...prev, [key]: value}));

  const number = (event, fallback) => {
    const parsed = Number(event.target.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  const handleSave = async (event) => {
    const promise = (async () => {
      setSaving(true);
      setError(null);
      try {
        await updateSettings(draft);
        shopify.toast.show('Settings saved');
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : 'Could not save',
        );
        throw saveError;
      } finally {
        setSaving(false);
      }
    })();

    event?.waitUntil?.(promise);
    await promise;
    return false;
  };

  const handleReset = () => {
    setDraft(settings);
    setError(null);
  };

  return (
    <s-page heading="Settings" inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/">
        Stock tasks
      </s-link>

      {error && (
        <s-section>
          <s-banner tone="critical">{error}</s-banner>
        </s-section>
      )}

      <s-section heading="What counts as low stock">
        <s-form onSubmit={handleSave} onReset={handleReset}>
          <s-stack direction="block" gap="base">
            <s-number-field
              label="Low stock threshold"
              name="threshold"
              labelAccessibilityVisibility="visible"
              min="0"
              value={String(draft.threshold)}
              details="Active products only. Variants at or below this many units show up in your inbox."
              onInput={(event) =>
                setField('threshold', number(event, draft.threshold))
              }
            />
            <s-number-field
              label="Supplier lead time (days)"
              name="leadTimeDays"
              labelAccessibilityVisibility="visible"
              min="0"
              value={String(draft.leadTimeDays)}
              details="How long a restock usually takes to arrive."
              onInput={(event) =>
                setField('leadTimeDays', number(event, draft.leadTimeDays))
              }
            />
            <s-number-field
              label="Buffer stock (days)"
              name="safetyDays"
              labelAccessibilityVisibility="visible"
              min="0"
              value={String(draft.safetyDays)}
              details="Extra days of stock to hold so a late delivery doesn't sell you out."
              onInput={(event) =>
                setField('safetyDays', number(event, draft.safetyDays))
              }
            />
            <s-email-field
              label="Who to chase about restocks"
              name="contactEmail"
              labelAccessibilityVisibility="visible"
              placeholder="you@example.com"
              value={draft.contactEmail}
              details="Shown in the weekly review. The app does not send email."
              onInput={(event) => setField('contactEmail', event.target.value)}
            />
            <s-switch
              label="Simple mode"
              name="simpleMode"
              checked={draft.simpleMode}
              details="Show only the product, days left, and how many to order."
              onChange={(event) => setField('simpleMode', event.target.checked)}
            />
          </s-stack>
        </s-form>
      </s-section>

      <s-section heading="How the suggestion is worked out">
        <s-stack direction="block" gap="small-200">
          <s-paragraph>
            Sales per day comes from the units sold in the last 30 days, divided
            by 30.
          </s-paragraph>
          <s-paragraph>
            Days left is your stock on hand divided by sales per day.
          </s-paragraph>
          <s-paragraph>
            The suggested order covers the lead time plus the buffer, minus what
            you already have: sales per day x ({draft.leadTimeDays} +{' '}
            {draft.safetyDays}) - stock on hand.
          </s-paragraph>
          <s-text color="subdued">
            {status === 'ready'
              ? 'Saving recalculates your inbox.'
              : 'Your inbox will be recalculated after saving.'}
          </s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}
