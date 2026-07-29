-- Criar extensão se não existir para criptografia de senha
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'vinicius@vgon.com.br';
  v_password text := 'Vgon@2012';
  v_enc_pw text;
  v_exists int;
BEGIN
  -- Verificar se usuário já existe
  SELECT count(*) INTO v_exists FROM auth.users WHERE email = v_email;
  
  IF v_exists = 0 THEN
      -- Gerar hash da senha (blowfish/bcrypt)
      v_enc_pw := crypt(v_password, gen_salt('bf'));
    
      -- Inserir em auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        v_enc_pw,
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    
      -- Inserir em auth.identities
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_user_id,
        format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb,
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
      );
    
      -- Inserir em public.users
      INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        cpf,
        status,
        department,
        position
      ) VALUES (
        v_user_id,
        v_email,
        'Vinicius Admin',
        'admin',
        '000.000.000-00',
        'active',
        'Diretoria',
        'Administrador'
      );
  END IF;
END $$;
