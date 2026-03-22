'use client';

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { Input } from '@/components/controls';
import Textarea from '@/components/controls/text-area';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import { detailsSchema } from '@/features/listings/validations/listing';

import styles from './details-step.module.scss';

interface DetailsFormValues {
  title: string;
  description: string;
}

export default function DetailsStep() {
  const title = useCreateWizardStore.use.title();
  const description = useCreateWizardStore.use.description();
  const setField = useCreateWizardStore.use.setField();

  const methods = useForm<DetailsFormValues>({
    resolver: yupResolver(detailsSchema) as any,
    mode: 'onChange',
    defaultValues: {
      title,
      description,
    },
  });

  const { watch } = methods;
  const titleValue = watch('title') ?? '';
  const descriptionValue = watch('description') ?? '';

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === 'title' && values.title !== undefined) {
        setField('title', values.title);
      }
      if (name === 'description' && values.description !== undefined) {
        setField('description', values.description);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setField]);

  return (
    <FormProvider {...methods}>
      <div className={styles.step}>
        <section className={styles.section}>
          <h2 className={styles.heading}>Describe your item</h2>

          <div className={styles.fieldGroup}>
            <Input
              name="title"
              label="Title"
              placeholder="[Brand] [Model] [Category] -- [Condition]"
              isRequired
            />
            <p className={styles.counter} aria-live="polite">
              {titleValue.length} / 80
            </p>
          </div>

          <div className={styles.fieldGroup}>
            <Textarea
              name="description"
              label="Description"
              placeholder="Describe the item's features, condition details, and anything a buyer should know."
              isRequired
            />
            <p className={styles.counter} aria-live="polite">
              {descriptionValue.length} / 2000
            </p>
          </div>
        </section>
      </div>
    </FormProvider>
  );
}
