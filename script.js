/* =====================================================
   script.js — Refactored and modularized
   - All function/variable names in English
   - Keeps HTML labels in Portuguese
   ===================================================== */

/* ===== Helpers ===== */
const onlyDigits = str => (str || '').toString().replace(/\D/g, '');
const formatCPF = cpf => {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const setValue = (idOrElem, value) => {
  if (value === undefined || value === null) value = '';
  const elem = (typeof idOrElem === 'string') ? document.getElementById(idOrElem) : idOrElem;
  if (!elem) return;
  if (elem.tagName === 'SELECT') elem.value = value;
  else elem.value = value;
};

/* ===== Dynamic operation fields templates ===== */
const OPERATION_TEMPLATES = {
  portabilidade: [
    ['Parcela', 'text', 'col-md-1'],
    ['Código da Tabela', 'text', 'col-md-2'],
    ['Nº do Contrato', 'text', 'col-md-2'],
    ['Banco Origem', 'text', 'col-md-2'],
    ['Código do Banco Origem', 'text', 'col-md-3'],
    ['Saldo Devedor', 'text', 'col-md-2'],
    ['Prazo Total', 'text', 'col-md-2'],
    ['Prazo Restante', 'text', 'col-md-2'],
    ['Refinanciamento', 'select', 'col-md-2', ['Selecione...', 'Sim', 'Não']],
    ['Código da Tabela Refin', 'text', 'col-md-3'],
    ['Prazo do Refinanciamento', 'text', 'col-md-3'],
    ['Seguro a ser Adicionado', 'text', 'col-md-3']
  ],
  margem: [
    ['Parcela', 'text', 'col-md-3'],
    ['Código da Tabela', 'text', 'col-md-3'],
    ['Prazo', 'text', 'col-md-3'],
    ['Seguro a ser Adicionado', 'text', 'col-md-3']
  ],
  cartao: [
    ['Parcela', 'text', 'col-md-2'],
    ['Código da Tabela', 'text', 'col-md-2'],
    ['Seguro a ser Adicionado', 'text', 'col-md-3'],
    ['Tipo do Cartão', 'select', 'col-md-2', ['Selecione...', 'RMC', 'RCC']],
    ['Deseja Saque', 'select', 'col-md-2', ['Selecione...', 'Sim', 'Não']]
  ],
  refin: [
    ['Parcela', 'text', 'col-md-3'],
    ['Código da Tabela', 'text', 'col-md-3'],
    ['Prazo', 'text', 'col-md-3'],
    ['Seguro a ser Adicionado', 'text', 'col-md-3']
  ]
};

const container = document.getElementById('camposOperacao');
const operationSelect = document.getElementById('tipoOperacao');

const FIELD_MAX_LENGTH = {
  'Parcela': 7,
  'Saldo Devedor': 9,
  'Nº do Contrato': 30,
  'Código do Banco Origem': 3,
  'Prazo Total': 3,
  'Prazo Restante': 3,
  'Prazo do Refinanciamento': 3,
  'Prazo': 3,
};

function buildOperationFields(operationKey) {
  container.innerHTML = '';
  const template = OPERATION_TEMPLATES[operationKey] || [];

  // Para gerar IDs únicos mesmo com campos repetidos
  const idCounters = {};

  template.forEach(field => {
    const [labelText, type, colClass, options] = field;
    const wrapper = document.createElement('div');
    wrapper.className = colClass || 'col-md-3';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = labelText;
    wrapper.appendChild(label);

    // Gerar um id seguro baseado no labelText e contador
    let baseId = labelText.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
    idCounters[baseId] = (idCounters[baseId] || 0) + 1;
    const fieldId = `${baseId}_${idCounters[baseId]}`;

    if (type === 'select') {
      const sel = document.createElement('select');
      sel.className = 'form-select form-select-sm';
      sel.id = fieldId;

      (options || []).forEach((opt, i) => {
        const o = document.createElement('option');
        if (i === 0) { o.selected = true; o.disabled = true; }
        o.textContent = opt;
        sel.appendChild(o);
      });

      // Adicionar maxlength se definido (não funciona em select, mas mantém compatibilidade)
      if (FIELD_MAX_LENGTH[labelText]) {
        sel.setAttribute('maxlength', FIELD_MAX_LENGTH[labelText]);
      }

      wrapper.appendChild(sel);
    } else {
      const inp = document.createElement('input');
      inp.type = type || 'text';
      inp.className = 'form-control form-control-sm';
      inp.id = fieldId;

      // oninput para campos "Parcela" e "Saldo Devedor"
      if (labelText === 'Parcela' || labelText === 'Saldo Devedor') {
        inp.setAttribute('oninput', 'floatFormat(this)');
      }

      // Adicionar maxlength personalizado
      if (FIELD_MAX_LENGTH[labelText]) {
        inp.setAttribute('maxlength', FIELD_MAX_LENGTH[labelText]);
      }

      wrapper.appendChild(inp);
    }

    container.appendChild(wrapper);
  });
}

/* ===== LocalStorage helpers ===== */
const STORAGE_PREFIX = 'cliente_';
const BACKUP_KEY = 'formularioProposta';

function saveByCPF(data) {
  const cpfRaw = onlyDigits(data['id-cpf'] || document.getElementById('id-cpf')?.value || '');
  if (cpfRaw.length !== 11) {
    console.warn('Invalid CPF, saving to fallback key');
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
    return;
  }
  const key = STORAGE_PREFIX + cpfRaw;
  data._savedAt = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
}

function retrieveByCPF(cpf) {
  const cpfRaw = onlyDigits(cpf || '');
  if (cpfRaw.length !== 11) return null;
  const raw = localStorage.getItem(STORAGE_PREFIX + cpfRaw);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* ===== Fill form ===== */
function fillOperationFieldsFromArray(valuesArray) {
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach((el, i) => { el.value = valuesArray[i] ?? ''; });
}

function fillFormWithData(obj) {
  if (!obj) return;
  Object.entries(obj).forEach(([k, v]) => {
    const el = document.getElementById(k) || document.querySelector(`[name="${k}"]`);
    if (el) setValue(el, v);
  });

  if (obj.tipoOperacao) {
    operationSelect.value = obj.tipoOperacao;
    buildOperationFields(obj.tipoOperacao);
    if (Array.isArray(obj.camposOperacao) && obj.camposOperacao.length) {
      fillOperationFieldsFromArray(obj.camposOperacao);
    } else {
      const dynamicValues = Object.entries(obj)
        .filter(([key]) => key.startsWith('op_') || key.startsWith('campo_'))
        .map(([, val]) => val);
      if (dynamicValues.length) fillOperationFieldsFromArray(dynamicValues);
    }
  }
}



/* ===== Collect form data ===== */
function collectFormData() {
  const data = {};
  document.querySelectorAll('input, select, textarea').forEach(el => {
    const id = el.id || el.name || el.placeholder || el.className;
    data[id] = (el.value || '').toString().trim();
  });
  const dynamic = container.querySelectorAll('input, select');
  if (dynamic.length) data.camposOperacao = Array.from(dynamic).map(i => i.value);
  return data;
}

/* ===== Mock / test data ===== */
// function mockForm() {
//   const mock = {
//     'id-cpf': '123.456.789-00',
//     'id-nome': 'João da Silva',
//     'id-nascimento': '15/06/1986',
//     'id-rg': '1234567',
//     'id-uf-rg': 'SP',
//     'id-emissao': '10/03/2010',
//     'id-mae': 'Maria das Dores',
//     'id-pai': 'José da Silva',
//     'id-naturalidade': 'São Paulo',
//     'id-uf-naturalidade': 'SP',
//     'id-celular': '(11) 91234-5678',
//     'id-email': 'joaodasilva@email.com',
//     'id-cep': '01000-000',
//     'id-endereco': 'Rua das Flores',
//     'id-numero-endereco': '123',
//     'id-complemento-endereco': 'Apto 45',
//     'id-bairro': 'Centro',
//     'id-cidade': 'São Paulo',
//     'uf-endereco': 'SP',
//     'banco': '001 - Banco do Brasil',
//     'agencia': '1234-5',
//     'conta': '67890-1',
//     'tipo-conta': 'C/C',
//     'dv': '7',
//     'tipoOperacao': 'portabilidade',
//     'camposOperacao': ['350,00', '12345', '998877', 'Banco Original', '001', '15000', '72', '24', '36', 'Sim']
//   };
//   fillFormWithData(mock);
// }

/* ===== Excel export using SheetJS ===== */
// function exportToExcel(data) {
//   const sheet = [
//     ['', 'FORMULÁRIO DE CADASTRO'],
//     [],
//     ['DADOS PESSOAIS'],
//     ['CPF', data['id-cpf']],
//     ['Nome', data['id-nome']],
//     ['Nascimento', data['id-nascimento']],
//     ['RG', data['id-rg']],
//     ['UF RG', data['id-uf-rg']],
//     ['Emissão', data['id-emissao']],
//     ['Mãe', data['id-mae']],
//     ['Pai', data['id-pai']],
//     ['Naturalidade', data['id-naturalidade']],
//     ['UF Naturalidade', data['id-uf-naturalidade']],
//     ['Celular', data['id-celular']],
//     ['E-mail', data['id-email']],
//     [],
//     ['ENDEREÇO'],
//     ['CEP', data['id-cep']],
//     ['Endereço', data['id-endereco']],
//     ['Número', data['id-numero-endereco']],
//     ['Complemento', data['id-complemento-endereco']],
//     ['Bairro', data['id-bairro']],
//     ['Cidade', data['id-cidade']],
//     ['UF', data['uf-endereco']],
//     [],
//     ['DADOS BANCÁRIOS'],
//     ['Banco', data['banco']],
//     ['Agência', data['agencia']],
//     ['Conta', data['conta']],
//     ['Tipo de Conta', data['tipo-conta']],
//     ['Dígito', data['dv']],
//     [],
//     ['TIPO DE OPERAÇÃO'],
//     ['Operação', data['tipoOperacao'] || '']
//   ];

//   const dynamic = container.querySelectorAll('input, select');
//   dynamic.forEach(el => {
//     const label = el.previousElementSibling?.innerText || 'Campo';
//     sheet.push([label, el.value]);
//   });

//   const wb = XLSX.utils.book_new();
//   const ws = XLSX.utils.aoa_to_sheet(sheet);
//   ws['!cols'] = [{ wch: 30 }, { wch: 40 }];
//   XLSX.utils.book_append_sheet(wb, ws, 'Cadastro');
//   XLSX.writeFile(wb, 'formulario_cadastro.xlsx');
// }


// async function exportToPDF(data) {
//   const { jsPDF } = window.jspdf;
//   const doc = new jsPDF();

//   let y = 15;
//   doc.setFontSize(14);
//   doc.text('FORMULÁRIO DE CADASTRO', 105, y, { align: 'center' });
//   y += 10;

//   doc.setFontSize(11);

//   const addSection = (title) => {
//     y += 8;
//     doc.setFont(undefined, 'bold');
//     doc.text(title, 10, y);
//     doc.setFont(undefined, 'normal');
//     y += 5;
//   };

//   const addField = (label, value) => {
//     if (y > 280) { doc.addPage(); y = 15; }
//     doc.text(`${label}: ${value || ''}`, 10, y);
//     y += 6;
//   };

//   addSection('DADOS PESSOAIS');
//   addField('CPF', data['id-cpf']);
//   addField('Nome', data['id-nome']);
//   addField('Nascimento', data['id-nascimento']);
//   addField('RG', data['id-rg']);
//   addField('UF RG', data['id-uf-rg']);
//   addField('Emissão', data['id-emissao']);
//   addField('Mãe', data['id-mae']);
//   addField('Pai', data['id-pai']);
//   addField('Naturalidade', data['id-naturalidade']);
//   addField('UF Naturalidade', data['id-uf-naturalidade']);
//   addField('Celular', data['id-celular']);
//   addField('E-mail', data['id-email']);

//   addSection('ENDEREÇO');
//   addField('CEP', data['id-cep']);
//   addField('Endereço', data['id-endereco']);
//   addField('Número', data['id-numero-endereco']);
//   addField('Complemento', data['id-complemento-endereco']);
//   addField('Bairro', data['id-bairro']);
//   addField('Cidade', data['id-cidade']);
//   addField('UF', data['uf-endereco']);

//   addSection('DADOS BANCÁRIOS');
//   addField('Banco', data['banco']);
//   addField('Agência', data['agencia']);
//   addField('Conta', data['conta']);
//   addField('Tipo de Conta', data['tipo-conta']);
//   addField('Dígito', data['dv']);

//   addSection('TIPO DE OPERAÇÃO');
//   addField('Operação', data['tipoOperacao']);

//   // Campos dinâmicos
//   const dynamicFields = container.querySelectorAll('input, select');
//   dynamicFields.forEach(el => {
//     const label = el.previousElementSibling?.innerText || 'Campo';
//     addField(label, el.value);
//   });

//   // Salva o arquivo
//   doc.save('formulario_cadastro.pdf');
// }

function formatDate(input) {
    input.value = input.value.replace(/\D/g, '');
    if (input.value.length >= 2) {
        input.value = input.value.slice(0, 2) + '/' + input.value.slice(2);
    }

    if (input.value.length > 5) {
        input.value = input.value.slice(0, 5) + '/' + input.value.slice(5);
    }

    if (input.value.length > 10) {
        input.value = input.value.slice(0, 10);
    }
}

function formatInputCPF(input) {
  let cpf = input.value.replace(/\D/g, "");
  if (cpf.length > 3 && cpf.length <= 6) {
    cpf = cpf.slice(0, 3) + "." + cpf.slice(3);
  } else if (cpf.length > 6 && cpf.length <= 9) {
    cpf = cpf.slice(0, 3) + "." + cpf.slice(3, 6) + "." + cpf.slice(6);
  } else if (cpf.length > 9) {
    cpf =
      cpf.slice(0, 3) +
      "." +
      cpf.slice(3, 6) +
      "." +
      cpf.slice(6, 9) +
      "-" +
      cpf.slice(9, 11);
  }
  input.value = cpf;
}

function formatCelphone(input) {
  let cel = input.value.replace(/\D/g, "");
  if (cel.length > 2 && cel.length <= 6) {
    cel = "(" + cel.slice(0, 2) + ")" + cel.slice(2);
  } else if (cel.length > 6 && cel.length <= 10) {
    cel = "(" + cel.slice(0, 2) + ")" + cel.slice(2, 6) + "-" + cel.slice(6);
  } else if (cel.length > 10) {
    cel =
      "(" + cel.slice(0, 2) + ")" + cel.slice(2, 7) + "-" + cel.slice(7, 11);
  }
  input.value = cel;
}

function formatCEP(input) {
  let cep = input.value.replace(/\D/g, "");
  if (cep.length > 2 && cep.length <= 5) {
    cep = cep.slice(0, 2) + "." + cep.slice(2);
  } else if (cep.length > 5) {
    cep = cep.slice(0, 2) + "." + cep.slice(2, 5) + "-" + cep.slice(5, 8);
  }
  input.value = cep;
}

function numberHandler(value) {
  return isNaN(parseFloat(value)) ? 0 : parseFloat(value);
}

function formatNumbersOnly(input) {
  input.value = input.value.replace(/\D/g, "");
}

function floatFormat(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) {
    const decimalPart = value.slice(-2);
    const integerPart = value.slice(0, -2);

    input.value = `${integerPart}.${decimalPart}`;
  } else {
    input.value = value;
  }
}

async function exportToPDF() {
  const data = collectFormData();
  const nome = data["id-nome"] || "Sem Nome";
  const operacao = data["tipoOperacao"] || "Não Informada";
  const logoPath = "logo.png";

  // Converte a logo para base64 para evitar erro CORS
  async function getBase64Image(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const logoBase64 = await getBase64Image(logoPath).catch(() => null);

  // Helper para criar tabela simples
  const makeTable = (pairs) => ({
    table: {
      widths: ['30%', '70%'],
      body: pairs.map(([label, value]) => [label, value || ''])
    },
    layout: 'lightHorizontalLines',
    fontSize: 9,
    margin: [0, 5, 0, 10]
  });

  // Campos dinâmicos da operação
  const dynamicFields = Array.from(document.querySelectorAll('#camposOperacao input, #camposOperacao select'))
    .map(el => [el.previousElementSibling?.innerText || el.id, el.value || '']);

  // Definição completa do PDF
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, 90, 30, 50],
    header: logoBase64
      ? {
          columns: [
            { image: logoBase64, width: 70 },
            {
              text: 'Formulário de Proposta',
              alignment: 'center',
              fontSize: 14,
              bold: true,
              margin: [0, 15, 0, 0]
            }
          ],
          margin: [30, 15, 30, 0]
        }
      : {
          text: 'Formulário de Proposta',
          alignment: 'center',
          fontSize: 14,
          bold: true,
          margin: [0, 20, 0, 0]
        },
    content: [
      { text: '\nDADOS PESSOAIS', style: 'section' },
      makeTable([
        ['CPF', data['id-cpf']],
        ['Nome', data['id-nome']],
        ['Nascimento', data['id-nascimento']],
        ['RG', data['id-rg']],
        ['UF do RG', data['id-uf-rg']],
        ['Emissão', data['id-emissao']],
        ['Mãe', data['id-mae']],
        ['Pai', data['id-pai']],
        ['Naturalidade', data['id-naturalidade']],
        ['UF Naturalidade', data['id-uf-naturalidade']],
        ['Celular', data['id-celular']],
        ['E-mail', data['id-email']]
      ]),

      { text: '\nDADOS DO CONVÊNIO', style: 'section' },
      makeTable([
        ['Orgão', data['id-orgao']],
        ['Espécie/Secretaria', data['id-especie']],
        ['Matrícula', data['id-matricula']],
        ['UF', data['uf-endereco']]
      ]),

      { text: '\nENDEREÇO', style: 'section' },
      makeTable([
        ['CEP', data['id-cep']],
        ['Endereço', data['id-endereco']],
        ['Número', data['id-numero-endereco']],
        ['Complemento', data['id-complemento-endereco']],
        ['Bairro', data['id-bairro']],
        ['Cidade', data['id-cidade']],
        ['UF', data['uf-endereco']]
      ]),

      { text: '\nDADOS BANCÁRIOS', style: 'section' },
      makeTable([
        ['Banco', data['banco']],
        ['Agência', data['agencia']],
        ['Conta', data['conta']],
        ['Tipo', data['tipo-conta']],
        ['Dígito Verificador', data['dv']]
      ]),
      
      { text: '\nTIPO DE OPERAÇÃO', style: 'section' },
      makeTable([['Operação Selecionada', operacao]]),

      ...(dynamicFields.length
        ? [
            { text: '\nCAMPOS DA OPERAÇÃO', style: 'section' },
            makeTable(dynamicFields)
          ]
        : []),

      { text: '\nOBSERVAÇÕES', style: 'section' },
      {
        text: data['id-observacoes'] || 'Nenhuma observação adicionada.',
        fontSize: 10,
        margin: [0, 0, 0, 10]
      },
    ],
    styles: {
      section: { fontSize: 12, bold: true, color: '#003366', margin: [0, 15, 0, 8] }
    }
  };

  pdfMake.createPdf(docDefinition).download(`${nome} - ${operacao}.pdf`);
}




/* ===== CPF auto-load behavior ===== */
function attachCPFHandlers() {
  const cpfInput = document.getElementById('id-cpf');
  if (!cpfInput) return;

  const tryLoadAndFill = () => {
    const val = cpfInput.value || '';
    const cpfRaw = onlyDigits(val);
    if (cpfRaw.length !== 11) return;
    const client = retrieveByCPF(cpfRaw);
    if (client) {
      fillFormWithData(client);
      cpfInput.value = formatCPF(cpfRaw);
    }
  };

  cpfInput.addEventListener('blur', tryLoadAndFill);
  cpfInput.addEventListener('input', () => {
    const cpfRaw = onlyDigits(cpfInput.value || '');
    if (cpfRaw.length === 11) tryLoadAndFill();
  });
}

/* ===== Form submission ===== */
function attachFormHandler() {
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = collectFormData();
    saveByCPF(data);
    // exportToExcel(data);
    exportToPDF();
  });
}

/* ===== Operation select handler ===== */
function attachOperationHandler() {
  if (!operationSelect) return;
  operationSelect.addEventListener('change', () => buildOperationFields(operationSelect.value));
}

// /* ===== Mock button creation ===== */
// function createMockButton() {
//   const btn = document.createElement('button');
//   btn.type = 'button';
//   btn.className = 'btn btn-warning mt-3';
//   btn.textContent = 'Mockar Dados de Teste';
//   btn.addEventListener('click', mockForm);
//   document.querySelector('form .text-center')?.appendChild(btn);
// }


document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const toastEl = document.getElementById('toastAlert');
  const toastBody = document.getElementById('toastMessage');
  const toast = new bootstrap.Toast(toastEl);

  // Ativar o comportamento de auto-carregar cliente pelo CPF
  attachCPFHandlers();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let camposInvalidos = [];
    const campos = form.querySelectorAll('input[required], select[required]');

    campos.forEach(campo => {
      if (!campo.value.trim() || campo.value === 'Selecione...') {
        campo.classList.add('is-invalid');
        camposInvalidos.push(campo);
      } else {
        campo.classList.remove('is-invalid');
      }
    });

    if (camposInvalidos.length > 0) {
      toastEl.classList.add('text-bg-danger');
      toastEl.classList.remove('text-bg-success');
      toastBody.textContent = "Preencha todos os campos obrigatórios antes de enviar.";
      toast.show();
      camposInvalidos[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    toastEl.classList.remove('text-bg-danger');
    toastEl.classList.add('text-bg-success');
    toastBody.textContent = "Formulário validado com sucesso! Gerando PDF...";
    toast.show();

    const data = collectFormData();
    saveByCPF(data);
    await exportToPDF();
  });
});



/* ===== Init ===== */
function init() {
  attachOperationHandler();
//   attachCPFHandlers();
//   attachFormHandler();
  // createMockButton();
}
init();
